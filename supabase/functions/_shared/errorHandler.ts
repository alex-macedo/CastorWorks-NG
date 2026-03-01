/**
 * Secure error handling utility for edge functions
 * Logs detailed errors server-side while returning safe, generic messages to clients
 */

export interface ErrorResponse {
  status: number;
  message: string;
}

/**
 * Maps error messages to safe client responses
 * Preserves authentication/authorization errors but genericizes others
 */
export function getSecureErrorResponse(error: unknown): ErrorResponse {
  // Log the full error details server-side for debugging
  console.error('Detailed error:', error);
  
  // Extract error message
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  // Map authentication and authorization errors (these are safe to expose)
  if (errorMessage === 'Unauthorized' || errorMessage.includes('not authenticated')) {
    return {
      status: 401,
      message: 'Authentication required. Please log in to continue.'
    };
  }
  
  if (
    errorMessage.includes('Access denied') ||
    errorMessage.includes('Administrative access') ||
    errorMessage.includes('Administrator privileges') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('not authorized')
  ) {
    return {
      status: 403,
      message: 'You do not have permission to perform this action.'
    };
  }
  
  // Map validation errors (safe to expose the type, not details)
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return {
      status: 400,
      message: 'The request contains invalid data. Please check your input and try again.'
    };
  }
  
  // Map not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return {
      status: 404,
      message: 'The requested resource was not found.'
    };
  }
  
  // For all other errors, return a generic 500 message
  // The actual error is logged server-side for debugging
  return {
    status: 500,
    message: 'An unexpected error occurred. Please try again later or contact support if the problem persists.'
  };
}

/**
 * Creates a standardized error response for edge functions
 * @param includeCause - When true, adds error.cause with the actual error message (for debugging)
 */
export function createErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  includeCause = false
): Response {
  const { status, message } = getSecureErrorResponse(error);
  const errMsg = error instanceof Error ? error.message : String(error);

  const body: Record<string, unknown> = {
    error: message,
    timestamp: new Date().toISOString(),
  };
  if (includeCause && status >= 500) {
    body.cause = errMsg;
  }

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
