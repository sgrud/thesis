FROM pandoc/latex:latest
ADD https://github.com/KDE/syntax-highlighting/archive/master.tar.gz /tmp/
RUN apk add font-liberation && tar xzf /tmp/master.tar.gz -C /opt \
  --strip-components 2 --wildcards '*/data/syntax'
