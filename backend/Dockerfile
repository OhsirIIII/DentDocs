FROM python:3.12-slim
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock
COPY app app
COPY seed seed
RUN useradd --create-home clinic && mkdir -p /data/files && chown -R clinic:clinic /data
# Build-time package managers and their vendored dependencies are not needed at runtime.
RUN python -m pip uninstall -y pip setuptools && rm app/ocr_native.py app/ocr_worker.py
# DSA-6607-1: fail a stale/cached build rather than shipping vulnerable APT.
RUN dpkg --compare-versions "$(dpkg-query -W -f='${Version}' apt)" ge 3.0.4
USER clinic
CMD ["uvicorn", "app.asgi:app", "--host", "0.0.0.0", "--port", "8000"]
