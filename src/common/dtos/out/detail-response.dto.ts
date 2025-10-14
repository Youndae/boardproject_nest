import { Type } from '@nestjs/common';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { UserStatusDTO } from '#common/dtos/out/user-status.dto';

export const createDetailResponseDTO = <TModel extends Type<any>>(model: TModel, name: string) => {
  class DetailResponseDTO {
    @ApiProperty({
      description: '게시글 상세 데이터',
      type: model,
      items: { $ref: getSchemaPath(model)}
    })
    content: InstanceType<TModel>;

    @ApiProperty({
      description: '사용자 상태 객체',
      type: UserStatusDTO,
    })
    userStatus: UserStatusDTO;

    constructor(content: InstanceType<TModel>, userStatus: UserStatusDTO) {
      this.content = content;
      this.userStatus = userStatus;
    }
  }
  Object.defineProperty(DetailResponseDTO, 'name', { value: name });
  return DetailResponseDTO;
}