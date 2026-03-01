/**
 * CastorWorks INSS Obra Module - Error Handling
 * Standardized error codes for tax compliance logic
 */

export enum TaxErrorCode {
  /** VAU reference value not found for the given state and period */
  VAU_NOT_FOUND = 'CW_INSS_001',
  
  /** Discrepancy detected between areas in documents vs. declared */
  AREA_MISMATCH = 'CW_INSS_002',
  
  /** CNO location (state) conflicts with declared VAU state */
  STATE_CONFLICT = 'CW_INSS_003',
  
  /** Required evidence (Habite-se, etc.) missing for applied reduction */
  MISSING_EVIDENCE = 'CW_INSS_004',
  
  /** Project is not eligible for Decadência (statute of limitations < 5 years) */
  DECADENCIA_INVALID = 'CW_INSS_005',
  
  /** Failed to transmit or retrieve status from SERO/DCTFWeb */
  SUBMISSION_FAILED = 'CW_INSS_006',
  
  /** Invalid status transition (e.g., closing without payment) */
  WORKFLOW_VIOLATION = 'CW_INSS_007',
}

export class TaxError extends Error {
  public code: TaxErrorCode;
  public details?: Record<string, any>;

  constructor(code: TaxErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'TaxError';
    this.code = code;
    this.details = details;
    
    // Set the prototype explicitly for built-in class inheritance in TS
    Object.setPrototypeOf(this, TaxError.prototype);
  }

  /**
   * Helper to format error for UI display
   */
  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Type guard for TaxError
 */
export function isTaxError(error: unknown): error is TaxError {
  return error instanceof TaxError;
}
