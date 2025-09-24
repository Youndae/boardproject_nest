import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AnonymousGuard } from '#common/guards/anonymous.guard';

@Controller('member')
export class MemberController {

  @UseGuards(AnonymousGuard)
  @Post('/login')
  postLogin() {
    return 'ok';
  }
}
