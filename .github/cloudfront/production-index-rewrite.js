function buildQueryString(querystring) {
  var parts = [];
  for (var key in querystring) {
    var param = querystring[key];
    if (param.multiValue) {
      for (var i = 0; i < param.multiValue.length; i++) {
        parts.push(
          param.multiValue[i].value !== ''
            ? key + '=' + param.multiValue[i].value
            : key
        );
      }
    } else {
      parts.push(param.value !== '' ? key + '=' + param.value : key);
    }
  }
  return parts.length > 0 ? '?' + parts.join('&') : '';
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host ? request.headers.host.value.toLowerCase() : '';
  var qs = buildQueryString(request.querystring);

  if (host === 'asisto.com.br') {
    var targetPath = uri;
    var lastSeg = uri.substring(uri.lastIndexOf('/') + 1);
    if (!uri.endsWith('/') && lastSeg.indexOf('.') === -1) {
      targetPath = uri + '/';
    }
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://www.asisto.com.br' + targetPath + qs } }
    };
  }

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
    return request;
  }

  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: uri + '/' + qs } }
    };
  }

  return request;
}
