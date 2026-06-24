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

if "uploader_key" not in st.session_state:
    st.session_state.uploader_key = 0

uploaded_images = st.file_uploader("Upload an image of food", type=["jpg", "jpeg", "png"], max_upload_size=200, key=f"uploaded_images_{st.session_state.uploader_key}")


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
with st.form(key="label_submit_form", clear_on_submit=True):
    st.write("### Image Labeling")
    label = st.text_input(
        "What food(s) are in the image you uploaded? \
                            You can enter text like 'pizza', 'burger', etc:",
        max_chars=200,
        icon="🍔",
        placeholder="Burger",
    )
    country = st.text_input(
        "Which country is this food from? (optional)",
        max_chars=100,
        placeholder="Myanmar",
        icon="🏠",
    )
    email = st.text_input(
        "Your email (optional, for updates on the project)",
        max_chars=100,
        autocomplete="email",
        icon="📧",
        placeholder="user@gmail.com",
    )

    st.info("**Note:** If you click upload image, your image will be stored on \
           **Nutrify** servers and used to create the largest \
            food image database in the world!")
    submit_button = st.form_submit_button(
        "Upload Image",
        help="Click to upload the image and label to Nutrify server.",
    )

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
    with st.spinner("Uploading image to server..."):
        try:
            upload_blob(
                uploaded_images,
                destination_blob_name,
                content_type="image/jpeg",
            )
        except RuntimeError as error:
            st.error(str(error))
            st.stop()

    # Store metadata in Google Sheets
    img_width, img_height = image.size
    image_info = [
        unique_image_id,
        current_time,
        img_height,
        img_width,
        email,
        country,
        label,
    ]
    try:
        response = append_values_to_gsheet([image_info])
    except (PermissionError, RuntimeError) as error:
        st.error(str(error))
        st.stop()

    print("Google Sheets Response:", response)
    print("Image Info:", image_info)

    st.success("Image uploaded successfully! Thank You🙏")

    # Remove Image after being Uploaded
    if "uploaded_images" in st.session_state:
        del st.session_state["uploaded_images"]

    # Remove Image File after being Uploaded
    st.session_state.uploader_key += 1

    st.rerun()

st.write("## FAQ")
with st.expander("What happens to my image?"):
    st.write("""
    When you click "upload image", your image gets stored on Nutrify servers\
         (a big hard drive on Google Cloud).\n
    Here's a pretty picture which describes it in more detail:
    """)
    st.image("./images/image-uploading-workflow-with-background.png")
    st.write("Later on, images in the database will be used to train a computer \
            vision model to power Nutrify.")
with st.expander("Why do you need images of food?"):
    st.write("""
    Machine learning models learn by looking at many different examples \
        of things.\n
    Food included.\n
    Eventually, Nutrify wants to be an app you can use to *take a photo of \
        food and learn about it*.\n
    To do so, we'll need many different examples of foods to build a \
        computer vision
    model capable of identifying almost anything you can eat.\n
    And the more images of food you upload, the better the models will get.
    """)
