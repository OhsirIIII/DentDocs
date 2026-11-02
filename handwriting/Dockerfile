FROM python:3.12-slim
WORKDIR /service
RUN pip install --no-cache-dir torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir transformers==4.57.1 pillow==12.1.1 sentencepiece==0.2.1 protobuf==6.33.5
COPY server.py .
RUN useradd --create-home reader
USER reader
ENV HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 OMP_NUM_THREADS=2
CMD ["python", "-u", "server.py"]
