import { Type } from '@nestjs/common';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { UserStatusDTO } from '#common/dtos/out/user-status.dto';

export const createListResponseDTO = <TModel extends Type<any>>(model: TModel, name: string) => {
  class ListResponseDTO {
    @ApiProperty({
      description: '리스트 응답 데이터 리스트',
      type: 'array',
      items: { $ref: getSchemaPath(model) },
    })
    content: InstanceType<TModel>[];

    @ApiProperty({
      example: false,
      description: '리스트가 비어있는지 여부'
    })
    empty: boolean;

    @ApiProperty({
      example: 100,
      description: '총 데이터 개수'
    })
    totalElements: number;

    @ApiProperty({
      description: '사용자 상태 객체',
      type: UserStatusDTO,
    })
    userStatus: UserStatusDTO;

    constructor(content: InstanceType<TModel>[], totalElements: number, userStatus: UserStatusDTO) {
      this.content = content;
      this.empty = content.length === 0;
      this.totalElements = totalElements;
      this.userStatus = userStatus;
    }
  }

  Object.defineProperty(ListResponseDTO, 'name', { value: name })
  return ListResponseDTO;
}