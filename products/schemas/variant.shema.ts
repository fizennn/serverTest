import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Size {
  @Prop({ required: true })
  size!: string;

  @Prop({ required: true, default: 0 })
  stock!: number;

  @Prop({ required: true, default: 0 })
  price!: number;
}

export const SizeSchema = SchemaFactory.createForClass(Size);

@Schema()
export class Variant {
  @Prop({ required: true })
  color!: string;

  @Prop({ required: true })
  image!: string;

  @Prop({ type: [SizeSchema], default: [] })
  sizes!: Size[];
}

export const VariantSchema = SchemaFactory.createForClass(Variant);
