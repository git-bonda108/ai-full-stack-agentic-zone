"""Logging + tracing setup.

- Always: JSON logs to stdout (Container Apps ships stdout to Log Analytics).
- When APPLICATIONINSIGHTS_CONNECTION_STRING is set: the Azure Monitor
  OpenTelemetry distro exports traces (incl. our step.* spans), logs and
  metrics to Application Insights.
"""

import json
import logging
import sys
from datetime import UTC, datetime

from backend.app.config import Settings

_STANDARD_ATTRS = set(vars(logging.makeLogRecord({})).keys()) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    """One JSON object per line: easy to query with KQL."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "event": record.getMessage(),
        }
        for key, value in vars(record).items():
            if key not in _STANDARD_ATTRS:
                entry[key] = value
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


def configure_tracing(settings: Settings, app=None) -> bool:
    """Enable Azure Monitor export if configured. Returns True when enabled."""
    if not settings.applicationinsights_connection_string:
        return False
    from azure.monitor.opentelemetry import configure_azure_monitor
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    configure_azure_monitor(
        connection_string=settings.applicationinsights_connection_string,
        logger_name="p2p",
    )
    if app is not None:
        FastAPIInstrumentor.instrument_app(app, excluded_urls="healthz,readyz")
    logging.getLogger("p2p").info("observability.azure_monitor_enabled")
    return True
