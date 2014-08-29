!function ($) {
  "use strict"; // jshint ;_;

  var _render = function(obj, p){
    var parent = $(p);
    var ic = 0;

    for (var key in obj) {
      if (!obj.hasOwnProperty(key)){
        continue;
      }
      ic +=1;

      var object = obj[key];
      var isNixObj = object.attr != undefined;
      var type;
      var value;
      if (isNixObj) {
        type = object.type;
        value = object.val;
      } else {
        type = typeof object;
        value = object;
      }

      // console.log(object);
      // console.log(key + ":" + type + ":" + value);

      if ($.isArray(value)) {
        // console.log("LIST");
        var arval = $('<li id="'+key+'"><span class="key fold">'+key+'</span><span>[</span><ul class="array"></ul><span>]</span></li>');
        parent.append(arval);
        arval.find('.unfold').data('card', _render(value, arval.find('.array')));

      } else if (isNixObj) {
        // console.log("MISC");
        parent.append('<li id="'+object.attr+'" class="pickme"><span class="key">'+key+'</span><option-entry val="'+value+'" typ="'+type+'" att="'+object.attr+'"></option-entry></li>');
      } else {
        // console.log("OBJECT");
        var oval = $('<li id="'+key+'"><span class="key fold">'+key+'</span><span>{</span><ul class="object"></ul><span>}</span></li>');
        parent.append(oval);
        oval.find('.unfold').data('card', _render(value, oval.find('.object')));
      }
    }
    return ic;
  };

  var JsonTree = function(self, data){

    $(self).on("click", '.jsontree .fold', function(e){
      e.preventDefault();
      $(this).addClass('folded').parent().find('ul').hide();
    });

    $(self).on('click', '.jsontree .fold.folded', function(e){
      e.preventDefault();
      $(this).removeClass('folded').parent().find('ul').show();
    });

    self.append('<ul class="jsontree"></ul>');
    _render([data], self.find('.jsontree'));
  };

  $.fn.jsontree = function (data) {
    return this.each(function () {
      var self = $(this);
      new JsonTree(self, data);
    });
  };

}(window.jQuery);
