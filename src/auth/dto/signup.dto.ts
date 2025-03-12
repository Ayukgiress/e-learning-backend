import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class SignUpDto {
  @IsNotEmpty()
  @IsString()
  readonly firstName: string;

  @IsNotEmpty()
  @IsString()
  readonly lastName: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter a correct email' })
  readonly email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  readonly password: string;

  @IsOptional()
  @IsString()
  readonly googleId?: string;

  @IsOptional()
  @IsEnum(['admin', 'instructor', 'student', 'guest'], {
    message: 'Role must be one of the following: admin, instructor, student, guest',
  })
  readonly role?: 'admin' | 'instructor' | 'student' | 'guest'; 
}