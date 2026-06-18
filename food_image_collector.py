from datetime import datetime
from utils import upload_blob
import streamlit as st
from PIL import Image
from save_to_gsheets import append_values_to_gsheet
from utils import create_unique_filename
from rich import print, pretty, traceback
pretty.install()
traceback.install()

st.title("Food Vision Image Collector 🍔")
st.write("Upload images of food to help us build a delicious dataset!")

uploaded_images = st.file_uploader("Upload an image of food", type=["jpg", "jpeg", "png"])

# Display the uploaded image if available
def display_image(img):
    if img is not None:
        image = Image.open(img)
        print("Displaying Image....")
        st.image(image, caption="Uploaded Image", width=400)
        return image 
    return None

image = display_image(uploaded_images)   

# Create Image Label Form
form = st.form(key = "label_submit_form", clear_on_submit=True)
label = form.text_input("What food(s) are in the image you uploaded?:", max_chars=200)

st.write("If you click upload image, your image will be stored on \
        Nutrify servers and used to create the largest food image database \
        in the world!")
submit_button = form.form_submit_button("Upload Image", help="Click to upload the image and label to Nutrify server.")

if submit_button:
    # Check if an image has been uploaded
    if image is None:
        st.error("Please upload an image first!")
        st.stop()

    # Generate a unique filename for stored image
    unique_image_id = create_unique_filename()

    # Generate current date and time
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Upload the image to Google Cloud Storage
    bucket_name = "food-vision-project-images"
    destination_blob_name = f"{unique_image_id}.jpg"
    upload_blob(bucket_name, uploaded_images, destination_blob_name, content_type="image/jpeg")
    
    # Store metadata in Google Sheets
    img_width, img_height = image.size
    image_info = [unique_image_id, current_time, img_height, img_width, label]
    response = append_values_to_gsheet([image_info])

    print("Google Sheets Response:", response)
    print("Image Info:", image_info)

    st.success("Image uploaded successfully!")