import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  readonly title: string;

  @IsNotEmpty()
  @IsString()
  readonly description: string;

  @IsOptional()
  readonly courseImage?: Express.Multer.File;


  @IsNotEmpty()
  @IsString()
  readonly instructor: string;

  @IsOptional()
  @IsArray()
  readonly attachments?: string[];
}
