import { Controller, Delete, Get, Post } from '@nestjs/common';

@Controller('comment')
export class CommentController {
  constructor() {}

  /**
   * @query {
   *   boardNo: number,
   *   pageNum?: number
   * }
   *
   * @returns {
   *   status: 200,
   *   data: {
   *     content: [
   *       {
   *         commentNo: number,
   *         userId: string,
   *         commentDate: Date,
   *         commentContent: string,
   *         commentGroupNo: number,
   *         commentIndent: number,
   *         commentUpperNo: string
   *       },
   *     ],
   *     empty: boolean,
   *     totalElements: number,
   *     userStatus: {
   *       loggedIn: boolean,
   *       uid: string
   *     }
   *   }
   * }
   */
  @Get('/board')
  async getBoardCommentList(): Promise<void> {}

  /**
   * @query {
   *   imageNo: number,
   *   pageNum?: number
   * }
   *
   * @returns {
   *   status: 200,
   *   data: {
   *     content: [
   *       {
   *         commentNo: number,
   *         userId: string,
   *         commentDate: Date,
   *         commentContent: string,
   *         commentGroupNo: number,
   *         commentIndent: number,
   *         commentUpperNo: string
   *       },
   *     ],
   *     empty: boolean,
   *     totalElements: number,
   *     userStatus: {
   *       loggedIn: boolean,
   *       uid: string
   *     }
   *   }
   * }
   */
  @Get('/image')
  async getImageBoardCommentList(): Promise<void> {}

  /**
   * @param {
   *   commentContent: string
   * } body
   * @param boardNo
   *
   * @returns {
   *   status 201
   * }
   */
  @Post('/board/:boardNo')
  async postBoardComment(): Promise<void> {}

  /**
   * @param {
   *   commentContent: string
   * } body
   * @param imageNo
   *
   * @returns {
   *   status 201
   * }
   */
  @Post('/image/:imageNo')
  async postImageBoardComment(): Promise<void> {}

  /**
   * @param comentNo
   *
   * @returns {
   *   status: 204
   * }
   */
  @Delete('/:commentNo')
  async deleteComment(): Promise<void> {}

  /**
   * @param {
   *   commentContent: string,
   *   commentGroupNo: number,
   *   commentIndent: number,
   *   commentUpperNo: string
   * } body
   * @param boardNo
   *
   * @returns {
   *   status: 201
   * }
   */
  @Post('/board/:boardNo/reply')
  async postReplyBoardComment(): Promise<void> {}

  /**
   * @param {
   *   commentContent: string,
   *   commentGroupNo: number,
   *   commentIndent: number,
   *   commentUpperNo: string
   * } body
   * @param imageNo
   *
   * @returns {
   *   status: 201
   * }
   */
  @Post('/image/:imageNo/reply')
  async postReplyImageBoardComment(): Promise<void> {}
}
