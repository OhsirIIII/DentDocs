FROM postgres:17-alpine
RUN apk add --no-cache --virtual .vector-build build-base curl \
    && curl -fsSL https://github.com/pgvector/pgvector/archive/refs/tags/v0.8.7.tar.gz -o /tmp/pgvector.tar.gz \
    && tar -xzf /tmp/pgvector.tar.gz -C /tmp \
    && cd /tmp/pgvector-0.8.7 \
    && make OPTFLAGS="" with_llvm=no \
    && make install with_llvm=no \
    && rm -rf /tmp/pgvector-0.8.7 /tmp/pgvector.tar.gz \
    && apk del .vector-build
