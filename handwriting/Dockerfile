FROM python:3.12-slim
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
WORKDIR /service
RUN pip install --no-cache-dir torch==2.10.0 --index-url https://download.pytorch.org/whl/cpu
COPY requirements.lock .
RUN pip install --no-cache-dir --no-deps -r requirements.lock
COPY server.py .
RUN useradd --create-home reader && python -m pip install --no-cache-dir --upgrade pip==26.3
USER reader
ENV HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 OMP_NUM_THREADS=2
CMD ["python", "-u", "server.py"]
