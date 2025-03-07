import { IsBoolean, IsOptional } from 'class-validator';

export class RefreshDto {
  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;
}
