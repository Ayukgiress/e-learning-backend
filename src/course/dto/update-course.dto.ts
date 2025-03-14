import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  readonly title?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  readonly instructor?: string;

  @IsOptional()
  @IsArray()
  readonly attachments?: string[];
}