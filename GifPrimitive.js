import SuperGif from 'libgif'

function GifPrimitive(options){
    this._canvas = undefined;

    var that = this;
    var url = options.url;
    var div = document.createElement('div');
    var img = document.createElement('img');
    img.setAttribute('rel:animated_src', url)
    img.setAttribute('rel:auto_play', '1')
    div.appendChild(img)
    var rub = new SuperGif({ gif: img });
    rub.load_url(url,function(){
        that._canvas = rub.get_canvas();
    });
    this._div = div;
    this._gif = rub;
    this._currentFrame = 0;
    this._options = options;
    var fs = "czm_material czm_getMaterial(czm_materialInput materialInput) { \n" +
      "    czm_material material = czm_getDefaultMaterial(materialInput); \n" +
      "    vec2 st = materialInput.st; \n" +
      "    vec4 color = texture2D(image, st); \n" +
      "    color = czm_gammaCorrect(color); \n" +
      "    material.diffuse = color.rgb; \n" +
      "    material.alpha = color.a; \n" +
      "    material.shininess = 8.0; \n" + // Sharpen highlight
      "    return material; \n" +
      "} \n";
    this._fs = Cesium.defaultValue(options.fragmentShaderSource,fs);
    this._primitive = undefined;
    this._appearance = options.appearance;
    this._dirty = false;
    this._show = true;
}

Object.defineProperties(GifPrimitive.prototype, {
    canvas: {
        get: function () {
            return this._canvas;
        },
    },
    appearance: {
        get: function () {
            return this._appearance;
        },
    },
    show: {
        get: function () {
            return this._show;
        },
        set: function (value) {
            this._show = value;
        }
    }
});

GifPrimitive.prototype.updateGeometry = function (options) {
    this._options = options;
    this._dirty = true;
};

GifPrimitive.prototype.update = function (frameState) {
    if(!Cesium.defined(this._canvas) || !this._show){
        return;
    }

    if(this._dirty || !Cesium.defined(this._primitive)){
        this._dirty = false;
        this._primitive = new Cesium.Primitive(this._options);
        this._primitive.appearance = this._appearance;
    }

    if(!Cesium.defined(this._texture)){
        this._createTexture(frameState.context);
    }

    if(frameState.passes.render){
        this._primitive.update(frameState);
    }

    if(this._currentFrame !== this._gif.get_current_frame()){
        this._currentFrame = this._gif.get_current_frame()
        this._texture.copyFrom(this._canvas);
    }
};

GifPrimitive.prototype._createTexture = function (context) {
    var sampler = new Cesium.Sampler({
        wrapS: Cesium.TextureWrap.CLAMP_TO_EDGE,
        wrapT: Cesium.TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
        magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR
    });

    this._texture = new Cesium.Texture({
        context: context,
        source: this._canvas,
        sampler: sampler,
    });

    var _uniforms = {
        image: this._texture,
    };
    
    if(Cesium.defined(this._options.uniforms)){
        Object.assign(_uniforms,this._options.uniforms);
    }

    this._appearance.material = new Cesium.Material({
        fabric: {
            uniforms: _uniforms,
            source: this._fs
        },
    });
};

GifPrimitive.prototype.isDestroyed = function () {
    return false;
};

GifPrimitive.prototype.destroy = function() {
    this._primitive = this._primitive && this._primitive.destroy();
    this._texture = this._texture && this._texture.destroy();
    this._div.remove();
    if(Cesium.defined(this._canvas)){
        this._canvas.remove();
    }
    this._canvas = this._div = undefined;
    return Cesium.destroyObject(this);
};


export default GifPrimitive;