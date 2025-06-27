import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
