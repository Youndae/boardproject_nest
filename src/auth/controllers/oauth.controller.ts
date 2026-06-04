import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnonymousGuard } from '#common/guards/anonymous.guard';
import { OAuthGuard } from '#common/guards/oauth.guard';

@ApiTags('oauth')
@Controller('oauth2')
export class OAuthController {

  @UseGuards(AnonymousGuard, OAuthGuard)
  @Get('/authorization/:provider')
  async oAuthLogin(@Param('provider') provider: string) {
    console.log('oauth login');
  }
}