import { DesignStyle } from './types';

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: 'minimalist',
    name: 'Tối Giản Hiện Đại',
    promptModifier: 'Apply a Minimalist Modern design style: clean lines, monochromatic color palette (whites, greys), matte finishes, functional simplicity, Scandinavian influence. Remove unnecessary ornamentation.',
    description: 'Sạch sẽ, công năng và đơn giản.',
    colorClass: 'bg-zinc-200 text-zinc-800'
  },
  {
    id: 'futuristic',
    name: 'Tương Lai Cyberpunk',
    promptModifier: 'Apply a Futuristic Cyberpunk design style: neon accents, dark metallic materials, sleek curves, carbon fiber textures, glowing interfaces, high-tech aesthetic.',
    description: 'Neon, công nghệ cao và bóng bẩy.',
    colorClass: 'bg-fuchsia-900 text-fuchsia-100'
  },
  {
    id: 'organic',
    name: 'Hữu Cơ Tự Nhiên',
    promptModifier: 'Apply an Organic Biophilic design style: natural flowing shapes, wood and stone textures, soft earth tones, parametric patterns inspired by nature, eco-friendly appearance.',
    description: 'Hình khối tự nhiên và chất liệu ấm áp.',
    colorClass: 'bg-emerald-900 text-emerald-100'
  },
  {
    id: 'industrial',
    name: 'Công Nghiệp Thô Mộc',
    promptModifier: 'Apply a Raw Industrial design style: exposed mechanisms, brushed steel, copper accents, rugged durability, utilitarian aesthetics, brutalist geometry.',
    description: 'Mạnh mẽ, thô mộc và tiện dụng.',
    colorClass: 'bg-slate-700 text-slate-200'
  },
  {
    id: 'luxury',
    name: 'Sang Trọng Cao Cấp',
    promptModifier: 'Apply a High Luxury design style: premium materials like gold, marble, and velvet, glossy finishes, elegant curves, sophisticated detailing, expensive and exclusive look.',
    description: 'Chất liệu cao cấp và sự thanh lịch.',
    colorClass: 'bg-amber-900 text-amber-100'
  }
];