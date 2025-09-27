// اسکریپت برای ایجاد آیکون‌های مختلف از یک تصویر اصلی
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    // ایجاد دایرکتوری آیکون‌ها
    const iconsDir = path.join(__dirname, 'assets', 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // ایجاد آیکون‌های پایه (در صورت نداشتن تصویر اصلی، آیکون‌های ساده ایجاد می‌کند)
    sizes.forEach(size => {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // پس‌زمینه گرادینت
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#0ff');
      gradient.addColorStop(1, '#f0f');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // متن آیکون
      ctx.fillStyle = 'white';
      ctx.font = `bold ${size / 3}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚗', size / 2, size / 2);
      
      // ذخیره آیکون
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer);
    });
    
    console.log('آیکون‌ها با موفقیت ایجاد شدند');
  } catch (error) {
    console.error('خطا در ایجاد آیکون‌ها:', error);
  }
}

generateIcons();
