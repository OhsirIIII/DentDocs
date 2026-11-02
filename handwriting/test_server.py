import io
import unittest
from PIL import Image
from server import crop_image


def encoded(fmt='PNG', size=(100, 60)):
    image = Image.new('RGB', size, 'white')
    image.paste('red', (0, 0, size[0] // 2, size[1]))
    output = io.BytesIO(); image.save(output, format=fmt)
    return output.getvalue()


class RegionTests(unittest.TestCase):
    def test_crop_preserves_region(self):
        crop, pixels = crop_image(encoded(), 0, [0, 0, .5, 1])
        self.assertEqual(pixels, [0, 0, 50, 60])
        self.assertEqual(crop.size, (50, 60))
        self.assertEqual(crop.getpixel((25, 30)), (255, 0, 0))

    def test_rotation_precedes_normalized_crop(self):
        crop, pixels = crop_image(encoded(), 90, [0, 0, 1, .5])
        self.assertEqual(pixels, [0, 0, 60, 50])
        self.assertEqual(crop.size, (60, 50))
        self.assertEqual(crop.getpixel((30, 25)), (255, 255, 255))

    def test_bad_regions_and_format(self):
        for rotation, box in [(45, [0, 0, 1, 1]), (0, [1, 0, 0, 1]), (0, [-.1, 0, .5, 1]), (0, [0, 0, .01, .01])]:
            with self.assertRaises(ValueError): crop_image(encoded(), rotation, box)
        with self.assertRaises(ValueError): crop_image(encoded('GIF'), 0, [0, 0, 1, 1])

    def test_image_pixel_limit(self):
        previous = Image.MAX_IMAGE_PIXELS
        try:
            Image.MAX_IMAGE_PIXELS = 100
            with self.assertRaises(Image.DecompressionBombError): crop_image(encoded(size=(20, 20)), 0, [0, 0, 1, 1])
        finally:
            Image.MAX_IMAGE_PIXELS = previous


if __name__ == '__main__':
    unittest.main()
