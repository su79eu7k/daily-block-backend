exports.errorTypes = {
  UNAUTHORIZED: 'UNAUTHORIZED'
}

exports.errorDetails = {
  UNAUTHORIZED: {
    statusCode: 401,
    errorType: 'UNAUTHORIZED',
    errorDescription: 'The HTTP 401 Unauthorized client error status response code indicates that the request has not been applied because it lacks valid authentication credentials for the target resource. This status is sent with a WWW-Authenticate header that contains information on how to authorize correctly. This status is similar to 403, but in this case, authentication is possible.'
  }
}
