
import { IsEmail, IsString } from 'class-validator';

export class CurrentUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  userId: string;

  @IsString()
  role?: string; 
}