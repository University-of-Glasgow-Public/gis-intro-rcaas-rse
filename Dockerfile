FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency files first (for caching)
COPY pyproject.toml uv.lock README.md ./
COPY src/gis_intro_rcaas_rse/py.typed src/gis_intro_rcaas_rse/

# Install dependencies (reproducible)
RUN uv sync --frozen

# Copy application code
COPY . .

#COPY entrypoint.sh /entrypoint.sh
#RUN chmod +x /entrypoint.sh

EXPOSE 5000

# Run with entrypoint script
#ENTRYPOINT ["/entrypoint.sh"]


# Run with gunicorn
CMD ["uv", "run", "gunicorn", "-b", "0.0.0.0:5000", "gis_intro_rcaas_rse.app:app"]