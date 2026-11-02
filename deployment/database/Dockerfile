FROM postgres:17-alpine
# Use Alpine's small privilege-drop helper instead of the bundled Go executable.
RUN apk add --no-cache su-exec \
    && sed -i 's/exec gosu postgres/exec su-exec postgres/' /usr/local/bin/docker-entrypoint.sh \
    && rm /usr/local/bin/gosu \
    && su-exec nobody true
RUN apk upgrade --no-cache && apk add --no-cache --virtual .vector-build build-base curl \
    && curl -fsSL https://github.com/pgvector/pgvector/archive/refs/tags/v0.8.7.tar.gz -o /tmp/pgvector.tar.gz \
    && tar -xzf /tmp/pgvector.tar.gz -C /tmp \
    && cd /tmp/pgvector-0.8.7 \
    && make OPTFLAGS="" with_llvm=no \
    && make install with_llvm=no \
    && rm -rf /tmp/pgvector-0.8.7 /tmp/pgvector.tar.gz \
    && apk del .vector-build
