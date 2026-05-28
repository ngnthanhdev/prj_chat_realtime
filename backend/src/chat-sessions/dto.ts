import { IsString, MinLength } from 'class-validator';

export class CreateChatSessionDto {
  @IsString()
  @MinLength(1)
  customerName!: string;
}
