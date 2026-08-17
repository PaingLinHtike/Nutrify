/* ═══════════════════════════════════════════
   Nutrify — Shared food-image upload to Supabase
   ═══════════════════════════════════════════ */

(function () {
  var supabase = window.__supabase;
  if (!supabase) {
    console.warn("Supabase not ready");
    return;
  }

  var BUCKET = "food-images";

  // ── Upload an image to Supabase Storage + food_images table ──
  // Returns { imageId, publicUrl } or throws.
  window.uploadFoodImage = async function (
    file,
    userId,
    opts,
  ) {
    opts = opts || {};
    var source = opts.source || "user_upload";
    var label = opts.label || null;
    var confidence = opts.confidence || null;

    // 1. Build storage path: uploads/{user_id}/{timestamp}-{random}.{ext}
    var ext = (file.name || "photo.jpg")
      .split(".")
      .pop()
      .toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].indexOf(ext) === -1) ext = "jpg";
    var path =
      "uploads/" +
      userId +
      "/" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2) +
      "." +
      ext;

    // 2. Upload to Supabase Storage
    var upRes = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
    if (upRes.error) throw upRes.error;

    var pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    var publicUrl = pub.data.publicUrl;

    // 3. Read dimensions from the image
    var dims = await readImageDimensions(file);

    // 4. Insert into food_images
    var imgInsert = await supabase
      .from("food_images")
      .insert({
        user_id: userId,
        image_url: publicUrl,
        height_px: dims.height,
        width_px: dims.width,
        predicted_label: label,
        confidence_score: confidence,
        source: source,
      })
      .select("id")
      .single();
    if (imgInsert.error) throw imgInsert.error;

    return { imageId: imgInsert.data.id, publicUrl: publicUrl };
  };

  function readImageDimensions(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = function () {
        resolve({ width: null, height: null });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }
})();
