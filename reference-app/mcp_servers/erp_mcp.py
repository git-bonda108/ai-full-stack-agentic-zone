"""ERP MCP server: exposes the (mock) ERP to Claude Code and other MCP hosts.

Claude Code launches this over stdio (see .mcp.json) and can then call
get_purchase_order / get_goods_receipts / get_vendor while you develop -
e.g. "check PO-1002 in the ERP and write a test for the quantity mismatch".

Outputs are TRIMMED by the same ErpClient the app uses, so the MCP tools
return ~5 fields instead of ~40 (tool-output bloat lesson).

Run manually (it waits for an MCP client on stdin/stdout):
    python -m mcp_servers.erp_mcp
"""

import json
import os
import sys
from pathlib import Path

# Allow `python mcp_servers/erp_mcp.py` as well as `python -m mcp_servers.erp_mcp`
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.integrations.erp_client import ErpClient  # noqa: E402

try:  # MCP Python SDK 2.x
    from mcp.server.mcpserver import MCPServer as _Server
except ImportError:  # MCP Python SDK 1.x
    from mcp.server.fastmcp import FastMCP as _Server

ERP_BASE_URL = os.environ.get("ERP_BASE_URL", "http://localhost:8001")

mcp = _Server("p2p-erp")


async def _with_client(call):
    client = ErpClient(ERP_BASE_URL)
    try:
        return await call(client)
    finally:
        await client.aclose()


@mcp.tool()
async def get_purchase_order(po_number: str) -> str:
    """Get a purchase order (vendor, currency, lines with qty + unit price), e.g. PO-1001."""
    po = await _with_client(lambda c: c.get_purchase_order(po_number))
    return po.model_dump_json() if po else json.dumps({"found": False, "po_number": po_number})


@mcp.tool()
async def get_goods_receipts(po_number: str) -> str:
    """List goods receipts (received quantity per SKU) posted against a PO number."""
    receipts = await _with_client(lambda c: c.get_goods_receipts(po_number))
    return json.dumps([receipt.model_dump() for receipt in receipts])


@mcp.tool()
async def get_vendor(vendor_id: str) -> str:
    """Get a vendor master record (name, IBAN last 4, blocked flag), e.g. V-100."""
    vendor = await _with_client(lambda c: c.get_vendor(vendor_id))
    if vendor is None:
        return json.dumps({"found": False, "vendor_id": vendor_id})
    data = vendor.model_dump()
    data["iban"] = "****" + data["iban"][-4:]
    return json.dumps(data)


if __name__ == "__main__":
    mcp.run()  # stdio transport by default
