FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

# (optional) make pip prefer wheels
RUN pip install --upgrade pip

COPY backend/requirements.txt /app/requirements.txt
# prefer wheels; will fail fast if a package has no wheel (optional strictness)
# RUN pip install --only-binary=:all: -r requirements.txt
# or just:
RUN pip install -r requirements.txt

COPY backend /app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
