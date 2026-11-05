FROM python:3.12-slim
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /service
RUN mkdir app && touch app/__init__.py && useradd --create-home parser
COPY backend/app/ocr_protocol.py backend/app/ocr_native.py backend/app/ocr_worker.py app/
COPY ocr/server.py .
RUN python -m pip uninstall -y pip setuptools
# DSA-6607-1: native-worker isolation does not replace package updates.
RUN dpkg --compare-versions "$(dpkg-query -W -f='${Version}' apt)" ge 3.0.4
USER parser
ENV OMP_THREAD_LIMIT=1 PYTHONDONTWRITEBYTECODE=1
CMD ["python", "-u", "server.py"]
