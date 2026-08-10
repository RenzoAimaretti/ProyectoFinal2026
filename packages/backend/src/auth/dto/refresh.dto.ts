import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsString({ message: 'El refreshToken debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El refreshToken es requerido' })
  refreshToken!: string;
}
