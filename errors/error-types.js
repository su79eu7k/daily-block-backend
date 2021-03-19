exports.errorTypes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  USER_EXISTS: 'USER_EXISTS'
}

exports.errorDetails = {
  UNAUTHORIZED: {
    statusCode: 401,
    errorType: 'UNAUTHORIZED',
    errorDescription: 'The HTTP 401 Unauthorized client error status response code indicates that the request has not been applied because it lacks valid authentication credentials for the target resource. This status is sent with a WWW-Authenticate header that contains information on how to authorize correctly. This status is similar to 403, but in this case, authentication is possible.'
  },
  USER_EXISTS: {
    statusCode: 409,
    errorType: 'USER_EXISTS',
    errorDescription: 'The HTTP 409 Conflict response status code indicates a request conflict with current state of the target resource. Conflicts are most likely to occur in response to a PUT request. For example, you may get a 409 response when uploading a file which is older than the one already on the server resulting in a version control conflict.'
  }
}
