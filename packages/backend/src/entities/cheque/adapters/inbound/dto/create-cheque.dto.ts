import { CreateChequeInput } from '../../../application/cheque.types';

// Protocol shape deliberately excludes companyId and status; caller's JWT sets the firma.
export type CreateChequeDto = CreateChequeInput;
