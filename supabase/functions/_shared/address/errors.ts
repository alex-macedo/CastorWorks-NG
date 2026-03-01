export type AddressErrorCode =
  | "invalid_request"
  | "not_found"
  | "provider_error"
  | "rate_limited";

export class AddressLookupError extends Error {
  status: number;
  code: AddressErrorCode;
  messages: string[];

  constructor(
    status: number,
    code: AddressErrorCode,
    message: string,
    messages: string[] = []
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.messages = messages;
  }
}

export function toSafeError(error: unknown): AddressLookupError {
  if (error instanceof AddressLookupError) {
    return error;
  }

  return new AddressLookupError(
    500,
    "provider_error",
    "Address lookup failed. Please try again."
  );
}
