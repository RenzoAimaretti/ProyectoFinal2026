import { CreateEcheqInput } from '../../../application/echeq.types';

// The JWT supplies companyId; never accept it from the request body.
export type CreateEcheqDto = CreateEcheqInput;
