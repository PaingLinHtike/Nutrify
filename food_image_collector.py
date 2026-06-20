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
        st.image(image, caption="Uploaded Image", width=300)
        return image 
    return None

image = display_image(uploaded_images)   

# Create Image Label Form
st.write("### Image Labeling")
st.write("# TESTING VERSION")

form = st.form(key = "label_submit_form", clear_on_submit=True)
label = form.text_input("What food(s) are in the image you uploaded? \
                        You can enter text like 'pizza', 'burger', etc.:", max_chars=200)
country = form.text_input("Which country is this food from? (optional)", max_chars=100)
email = form.text_input("Your email (optional, for updates on the project)", max_chars=100, autocomplete="email")

form.markdown("**Note:** If you click upload image, your image will be stored on \
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
    # bucket_name = "food-vision-project-images"
    destination_blob_name = f"{unique_image_id}.jpg"
    try:
        upload_blob(uploaded_images, destination_blob_name, content_type="image/jpeg")
    except RuntimeError as error:
        st.error(str(error))
        st.stop()
    
    # Store metadata in Google Sheets
    img_width, img_height = image.size
    image_info = [unique_image_id, current_time, img_height, img_width, email, country, label]
    try:
        response = append_values_to_gsheet([image_info])
    except (PermissionError, RuntimeError) as error:
        st.error(str(error))
        st.stop()

    print("Google Sheets Response:", response)
    print("Image Info:", image_info)

    st.success("Image uploaded successfully! Thank You🙏")
