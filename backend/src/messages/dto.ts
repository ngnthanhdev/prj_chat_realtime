import { IsString, MinLength } from 'class-validator';

export class SendTextMessageDto {
  @IsString()
  @MinLength(1)
  text!: string;
}
