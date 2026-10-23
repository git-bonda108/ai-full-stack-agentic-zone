"""The AP Orchestrator: a hybrid workflow with agentic islands.

    1. extract          Intake Agent (or regex parser offline)
    2. gather evidence  Match Agent || Risk Agent   (asyncio.gather = parallel)
    3. decide           policy.decide()             (deterministic, never an LLM)
    4. explain          Resolution Agent (or template offline)

The orchestration itself is plain code: the steps are known in advance, so a
workflow is cheaper, faster and easier to test than letting an LLM plan them.
`build_llm_orchestrator` shows the alternative "agents-as-tools" pattern.
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass

from agents import (
    Agent,
    InputGuardrailTripwireTriggered,
    Model,
    OutputGuardrailTripwireTriggered,
    Runner,
)
from opentelemetry import trace

from backend.app.agents.context import CaseContext
from backend.app.agents.intake_agent import build_intake_agent, parse_invoice_text
from backend.app.agents.match_agent import build_match_agent
from backend.app.agents.model_provider import get_model
from backend.app.agents.resolution_agent import build_resolution_agent
from backend.app.agents.risk_agent import build_risk_agent
from backend.app.domain.matching import three_way_match
from backend.app.domain.policy import decide
from backend.app.domain.risk import assess_risk
from backend.app.explain import build_evidence, template_resolution
from backend.app.schemas import (
    ExtractedInvoice,
    MatchResult,
    PolicyOutcome,
    ResolutionDraft,
    RiskReport,
)

logger = logging.getLogger("p2p.pipeline")
tracer = trace.get_tracer("p2p.pipeline")


@dataclass
class PipelineResult:
    invoice: ExtractedInvoice
    match: MatchResult
    risk: RiskReport
    outcome: PolicyOutcome
    resolution: ResolutionDraft
    evidence: dict
    duration_ms: float


def _record_usage(ctx: CaseContext, result) -> None:
    usage = result.context_wrapper.usage
    ctx.usage.add(usage.input_tokens, usage.output_tokens)


def _require_invoice(ctx: CaseContext) -> ExtractedInvoice:
    if ctx.invoice is None:
        raise RuntimeError("extract() must run before this step")
    return ctx.invoice


# --------------------------------------------------------------------------- step 1


async def extract(ctx: CaseContext, model: str | Model | None) -> ExtractedInvoice:
    with tracer.start_as_current_span("step.extract") as span:
        if model is None:
            invoice = parse_invoice_text(ctx.raw_text)
            ctx.log("Intake Agent", "extracted", mode="offline", confidence=invoice.confidence)
        else:
            try:
                result = await Runner.run(
                    build_intake_agent(model), ctx.raw_text, context=ctx, max_turns=3
                )
                _record_usage(ctx, result)
                invoice = result.final_output_as(ExtractedInvoice)
                ctx.log("Intake Agent", "extracted", mode="llm", confidence=invoice.confidence)
            except InputGuardrailTripwireTriggered:
                # The untrusted text tried to instruct the model: never show it to the LLM,
                # fall back to the deterministic parser. Risk checks will flag it.
                invoice = parse_invoice_text(ctx.raw_text)
                ctx.log("Guardrail", "input_tripwire", guardrail="prompt_injection_tripwire")
            except Exception as exc:  # resilience: provider down -> deterministic fallback
                logger.warning("llm.fallback", extra={"step": "extract", "error": str(exc)})
                invoice = parse_invoice_text(ctx.raw_text)
                ctx.log("Intake Agent", "fallback_offline", error=type(exc).__name__)
        span.set_attribute("invoice.number", invoice.invoice_number)
        span.set_attribute("invoice.confidence", invoice.confidence)
        ctx.invoice = invoice
        return invoice


# --------------------------------------------------------------------------- step 2


def _fact_block(invoice: ExtractedInvoice) -> str:
    """Only the fields the evidence agents need - not the raw invoice text."""
    return json.dumps(
        {
            "invoice_number": invoice.invoice_number,
            "vendor_id": invoice.vendor_id,
            "po_number": invoice.po_number,
        }
    )


async def gather_match(ctx: CaseContext, model: str | Model | None) -> MatchResult:
    invoice = _require_invoice(ctx)
    with tracer.start_as_current_span("step.match") as span:
        if model is not None:
            try:
                result = await Runner.run(
                    build_match_agent(model), _fact_block(invoice), context=ctx, max_turns=4
                )
                _record_usage(ctx, result)
                ctx.log("Match Agent", "note", text=str(result.final_output)[:300])
            except Exception as exc:
                logger.warning("llm.fallback", extra={"step": "match", "error": str(exc)})
        # Source of truth: make sure we have the ERP data even if the LLM skipped a tool.
        if ctx.purchase_order is None:
            ctx.purchase_order = await ctx.erp.get_purchase_order(invoice.po_number)
        if not ctx.goods_receipts:
            ctx.goods_receipts = await ctx.erp.get_goods_receipts(invoice.po_number)
        match = three_way_match(
            invoice,
            ctx.purchase_order,
            ctx.goods_receipts,
            price_tolerance_pct=ctx.settings.price_tolerance_pct,
        )
        span.set_attribute("match.reason_codes", [c.value for c in match.reason_codes])
        ctx.log("Match Agent", "matched", reason_codes=[c.value for c in match.reason_codes])
        return match


async def gather_risk(ctx: CaseContext, model: str | Model | None) -> RiskReport:
    invoice = _require_invoice(ctx)
    with tracer.start_as_current_span("step.risk") as span:
        if model is not None:
            try:
                result = await Runner.run(
                    build_risk_agent(model), _fact_block(invoice), context=ctx, max_turns=4
                )
                _record_usage(ctx, result)
                ctx.log("Risk Agent", "note", text=str(result.final_output)[:300])
            except Exception as exc:
                logger.warning("llm.fallback", extra={"step": "risk", "error": str(exc)})
        if ctx.vendor is None:
            ctx.vendor = await ctx.erp.get_vendor(invoice.vendor_id)
        ctx.duplicate = ctx.is_duplicate(invoice.invoice_number, invoice.vendor_id)
        report = assess_risk(invoice, ctx.vendor, ctx.duplicate, raw_text=ctx.raw_text)
        span.set_attribute("risk.reason_codes", [c.value for c in report.reason_codes])
        ctx.log("Risk Agent", "assessed", reason_codes=[c.value for c in report.reason_codes])
        return report


# --------------------------------------------------------------------------- step 4


async def resolve(
    ctx: CaseContext, outcome: PolicyOutcome, evidence: dict, model: str | Model | None
) -> ResolutionDraft:
    invoice = _require_invoice(ctx)
    risk = RiskReport.model_validate({"findings": evidence["risk_findings"]})
    with tracer.start_as_current_span("step.resolve"):
        if model is None:
            draft = template_resolution(invoice, outcome, risk, evidence["line_comparison"])
            ctx.log("Resolution Agent", "drafted", mode="offline")
            return draft
        fact_block = json.dumps(
            {
                "decision": outcome.decision.value,
                "reason_codes": [code.value for code in outcome.reason_codes],
                "policy_rule": outcome.rule,
                "invoice": invoice.model_dump(exclude={"confidence"}),
                "evidence": evidence,
            },
            default=str,
        )
        try:
            result = await Runner.run(
                build_resolution_agent(model), fact_block, context=ctx, max_turns=2
            )
            _record_usage(ctx, result)
            ctx.log("Resolution Agent", "drafted", mode="llm")
            return result.final_output_as(ResolutionDraft)
        except OutputGuardrailTripwireTriggered:
            ctx.log("Guardrail", "output_tripwire", guardrail="no_unauthorised_approval")
        except Exception as exc:
            logger.warning("llm.fallback", extra={"step": "resolve", "error": str(exc)})
            ctx.log("Resolution Agent", "fallback_offline", error=type(exc).__name__)
        return template_resolution(invoice, outcome, risk, evidence["line_comparison"])


# --------------------------------------------------------------------------- orchestrator


async def run_pipeline(ctx: CaseContext) -> PipelineResult:
    """Run the full workflow for one invoice. Never raises for model problems."""
    started = time.perf_counter()
    model = get_model(ctx.settings)

    with tracer.start_as_current_span("invoice.workflow") as span:
        span.set_attribute("llm.provider", ctx.settings.llm_provider)
        invoice = await extract(ctx, model)

        # Parallel fan-out: both evidence agents run at the same time.
        match, risk = await asyncio.gather(gather_match(ctx, model), gather_risk(ctx, model))

        outcome = decide(
            match.reason_codes + risk.reason_codes,
            invoice_total=invoice.total,
            approval_threshold=ctx.settings.approval_threshold,
        )
        ctx.outcome = outcome
        ctx.log(
            "Policy Engine",
            "decided",
            decision=outcome.decision.value,
            reason_codes=[c.value for c in outcome.reason_codes],
            rule=outcome.rule,
        )
        evidence = build_evidence(invoice, match, risk, outcome)
        resolution = await resolve(ctx, outcome, evidence, model)

        duration_ms = round((time.perf_counter() - started) * 1000, 1)
        evidence["processing_ms"] = duration_ms
        evidence["tokens"] = {
            "input": ctx.usage.input_tokens,
            "output": ctx.usage.output_tokens,
            "erp_tokens_saved_by_trimming": ctx.erp.audit_log.tokens_saved,
        }
        span.set_attribute("case.decision", outcome.decision.value)
        span.set_attribute("case.reason_codes", [c.value for c in outcome.reason_codes])
        span.set_attribute("llm.input_tokens", ctx.usage.input_tokens)
        span.set_attribute("llm.output_tokens", ctx.usage.output_tokens)
        span.set_attribute("case.processing_ms", duration_ms)

    return PipelineResult(
        invoice=invoice,
        match=match,
        risk=risk,
        outcome=outcome,
        resolution=resolution,
        evidence=evidence,
        duration_ms=duration_ms,
    )


def build_llm_orchestrator(model: str | Model) -> Agent[CaseContext]:
    """Teaching variant: an LLM orchestrator that calls specialists as tools.

    With agents-as-tools the orchestrator keeps control and receives only each
    specialist's final output. With handoffs (Agent(handoffs=[...])) control -
    and the conversation - moves to the specialist instead. We do not use this in
    the production path because the steps are fixed; see ADR-0001.
    """
    return Agent[CaseContext](
        name="AP Orchestrator",
        instructions=(
            "Triage the invoice. Call match_specialist and risk_specialist with the "
            "invoice number, vendor id and PO number, then summarise their findings. "
            "You never decide payment; the policy engine does."
        ),
        model=model,
        tools=[
            build_match_agent(model).as_tool(
                tool_name="match_specialist",
                tool_description="Collects purchase-order and goods-receipt evidence.",
            ),
            build_risk_agent(model).as_tool(
                tool_name="risk_specialist",
                tool_description="Collects vendor-master and duplicate-invoice evidence.",
            ),
        ],
    )
