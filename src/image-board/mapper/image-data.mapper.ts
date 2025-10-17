import { ImageData } from '#imageBoard/entities/image-data.entity';

export class ImageDataMapper {
  static toEntityByImageNameObject(
     images: { imageName: string, originName: string}[],
     imageNo: number,
     step: number = 0
  ): ImageData[] {
    return images.map((image) => {
      const entity: ImageData = new ImageData();
      entity.imageName = `board/${image.imageName}`;
      entity.imageNo = imageNo;
      entity.oldName = image.originName;
      entity.imageStep = ++step;

      return entity;
    })
  }
}