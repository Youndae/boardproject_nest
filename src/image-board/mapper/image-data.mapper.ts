import { ImageData } from '#imageBoard/entities/image-data.entity';

export class ImageDataMapper {
  static toEntityByImageNameObject(
     images: { imageName: string, originName: string}[],
     imageId: number,
     step: number = 0
  ): ImageData[] {
    return images.map((image) => {
      const entity: ImageData = new ImageData();
      entity.imageName = `${image.imageName}`;
      entity.imageId = imageId;
      entity.originName = image.originName;
      entity.imageStep = ++step;

      return entity;
    })
  }
}