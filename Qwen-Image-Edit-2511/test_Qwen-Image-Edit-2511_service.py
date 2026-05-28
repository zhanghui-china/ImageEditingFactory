import os
import torch
import time
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from diffusers import QwenImageEditPlusPipeline
from werkzeug.utils import secure_filename


app = Flask(__name__)

# 配置上传文件夹、输出文件夹和允许的文件扩展名
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

# 确保文件夹存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# 初始化模型和管道
MODEL_PATH = "/home1/zhanghui/models/Qwen/Qwen-Image-Edit-2511"
try:
    pipeline = QwenImageEditPlusPipeline.from_pretrained(
        MODEL_PATH, 
        torch_dtype=torch.bfloat16
    )
    pipeline.to('cuda')
    pipeline.set_progress_bar_config(disable=None)
    print("Pipeline loaded and ready for use.")
except Exception as e:
    print(f"Warning: Could not load model: {e}")
    print("Running in demo mode...")
    pipeline = None

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health():
    """健康检查接口"""
    return jsonify({"status": "ok", "model_loaded": pipeline is not None})

@app.route('/outputs/<filename>', methods=['GET'])
def get_output(filename):
    """获取生成的图片"""
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

@app.route('/edit_image', methods=['POST'])
def edit_image():
    try:
        # 检查请求中是否包含文件和提示词
        if ('files' not in request.files and 'file' not in request.files) or 'prompt' not in request.form:
            return jsonify({"error": "Missing file(s) or prompt in request"}), 400

        # 支持两种格式：单个 file 参数或多个 files 参数
        if 'files' in request.files:
            files = request.files.getlist('files')
        else:
            files = [request.files['file']]
            
        prompt = request.form.get('prompt', '')
        num_inference_steps = int(request.form.get('num_inference_steps', 40))
        guidance_scale = float(request.form.get('guidance_scale', 1.0))
        true_cfg_scale = float(request.form.get('true_cfg_scale', 4.0))
        seed = int(request.form.get('seed', 0))

        # 检查是否选择了文件
        if not files or len(files) == 0:
            return jsonify({"error": "No selected files"}), 400

        images = []
        temp_paths = []

        # 处理所有上传的文件
        for file in files:
            if file.filename == '':
                continue
            
            if file and allowed_file(file.filename):
                # 安全处理文件名并保存临时文件
                filename = secure_filename(file.filename)
                temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(temp_path)
                
                # 打开图像文件
                image = Image.open(temp_path)
                images.append(image)
                temp_paths.append(temp_path)

        if len(images) == 0:
            return jsonify({"error": "No valid images found"}), 400

        # 记录推理开始时间
        start_time = time.time()

        output_images = []
        if pipeline is not None:
            # 对每张图片进行编辑
            for i, image in enumerate(images):
                inputs = {
                    "image": [image],
                    "prompt": prompt,
                    "generator": torch.manual_seed(seed + i),
                    "true_cfg_scale": true_cfg_scale,
                    "negative_prompt": " ",
                    "num_inference_steps": num_inference_steps,
                    "guidance_scale": guidance_scale,
                    "num_images_per_prompt": 1,
                }

                with torch.inference_mode():
                    output = pipeline(**inputs)

                output_image = output.images[0]
                output_images.append(output_image)
        else:
            # 演示模式：返回原图
            print("Demo mode: returning original images")
            output_images = images

        # 记录推理结束时间
        end_time = time.time()
        inference_time = end_time - start_time
        print(f"真正推理部分花了 {inference_time:.2f} 秒")

        # 保存所有输出图片
        output_urls = []
        output_filenames = []
        for i, output_image in enumerate(output_images):
            timestamp = int(time.time() * 1000) + i
            output_filename = f"output_{timestamp}.png"
            output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
            output_image.save(output_path)
            output_urls.append(f"/outputs/{output_filename}")
            output_filenames.append(output_filename)

        # 删除临时文件
        for temp_path in temp_paths:
            try:
                os.remove(temp_path)
            except:
                pass

        # 返回结果（向后兼容：如果只有一张图片，同时返回单个字段）
        result = {
            "output_filenames": output_filenames,
            "output_urls": output_urls,
            "inference_time": f"{inference_time:.2f} seconds"
        }
        
        # 向后兼容：对于单图片请求，也返回旧格式字段
        if len(output_urls) == 1:
            result["output_filename"] = output_filenames[0]
            result["output_url"] = output_urls[0]
            
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


