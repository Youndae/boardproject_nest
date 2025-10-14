import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

export function ApiBearerCookie(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiBearerAuth('refresh-token'),
    ApiBearerAuth('ino'),
  )
}