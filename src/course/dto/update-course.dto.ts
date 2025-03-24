import { IsNotEmpty, IsString, IsArray, IsOptional, IsObject } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  readonly title?: string;

  // Use IsOptional and IsObject to validate the course image
  @IsOptional()
  @IsObject() // Ensures that courseImage is an object
  readonly courseImage?: Express.Multer.File;

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