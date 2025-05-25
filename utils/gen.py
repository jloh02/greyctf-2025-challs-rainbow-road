from PIL import Image
import numpy as np
import random

# --- Configuration ---
input_path = "flag.jpg"
output_path = "flag-out.png"

non_black_threshold = 30
blue_color = (0, 0, 255)

# Rainbow gradient (excluding blue)
rainbow_gradient = [
    (255, 0, 0),  # Red
    (255, 165, 0),  # Orange
    (255, 255, 0),  # Yellow
    (0, 255, 0),  # Green
    (75, 0, 130),  # Indigo
    (238, 130, 238),  # Violet
]


# --- Helper: Interpolate between two colors ---
def interpolate_color(c1, c2, t):
    return tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))


# --- Load and process image ---
img = Image.open(input_path).convert("RGB")
arr = np.array(img)
height, width, _ = arr.shape

# Identify black pixels
brightness = arr.sum(axis=2)
is_black = brightness <= non_black_threshold

# Prepare output array
output_arr = np.zeros_like(arr)

# Fill black pixels with blue
output_arr[is_black] = blue_color

# Compute gradient value (from 0 to 1) along the bottom-left to top-right diagonal
Y, X = np.meshgrid(np.arange(height), np.arange(width), indexing="ij")
gradient_map = (X + (height - 1 - Y)) / (width + height - 2)

# For non-black pixels, map to rainbow gradient
num_colors = len(rainbow_gradient) - 1
non_black_coords = np.where(~is_black)

for y, x in zip(*non_black_coords):
    g = gradient_map[y, x] * num_colors
    i = int(g)
    t = g - i
    c1 = rainbow_gradient[i]
    c2 = rainbow_gradient[min(i + 1, num_colors)]
    output_arr[y, x] = interpolate_color(c1, c2, t)

# Set border pixels to blue
output_arr[0, :] = blue_color
output_arr[-1, :] = blue_color
output_arr[:, 0] = blue_color
output_arr[:, -1] = blue_color

# Save final image
Image.fromarray(output_arr).save(output_path)
print(f"Saved gradient-colored image as {output_path}")
