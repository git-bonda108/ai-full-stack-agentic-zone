# Mock ERP image. Build from reference-app/:
#   docker build -f docker/erp.Dockerfile -t p2p-erp .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

WORKDIR /app
RUN pip install "fastapi>=0.115,<1.0" "uvicorn[standard]>=0.30"
COPY mock_erp ./mock_erp

RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/healthz')" || exit 1

CMD ["uvicorn", "mock_erp.main:app", "--host", "0.0.0.0", "--port", "8001"]
