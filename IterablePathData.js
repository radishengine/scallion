define(function() {

  'use strict';
  
  function splitPathSegments(str) {
    return str.match(/m[^m]*/gi);
  }
  
  function splitPathSteps(str) {
    return str
      .replace(/-\s+/g, '-')
      .match(/[a-z]\s*[^a-z]*/gi)
      .map(function(v) {
        return {
          type: v[0],
          values: v.slice(1).trim().split(/[\s,]+/g).map(parseFloat)
        };
      });
  }
  
  function IterablePathData(source) {
    if (Symbol.iterator in source) {
      this.source = source;
    }
    else {
      throw new Error('invalid source');
    }
  }
  IterablePathData.prototype = {
    [Symbol.iterator]: function() {
      var source = this.source;
      if (typeof source === 'string') {
        source = splitPathSteps(source);
      }
      return source[Symbol.iterator]();
    },
    toString: function() {
      if (typeof this.source === 'string') {
        return this.source;
      }
      var buf = [];
      for (var step of this.source) {
        buf.push(step.type + step.values.join(' '));
      }
      return buf.join('');
    },
    get guaranteesOneSegment() {
      if (typeof this.source === 'string') {
        return /^\s*m[^mz]*(?:z\s*)?$/i.test(this.source);
      }
      return false;
    },
    getSegments: function() {
      if (this.guaranteesOneSegment) return [this];
      var source = this.source;
      if (typeof source === 'string') {
        return splitPathSegments(source).map(function(segment) {
          return new IterablePathData(segment);
        });
      }
      var segments = [];
      var currentSteps = null;
      for (var step of source) {
        switch (step.type) {
          case 'm': case 'M':
            if (currentSteps) {
              var segment = new IterablePathData(currentSteps);
              Object.defineProperty(segment, 'guaranteesOneSegment', {value:true});
              segments.push(segment);
            }
            currentSteps = [];
            break;
        }
        currentSteps.push(step);
      }
      return segments;
    },
    get guaranteesBaseCommands() {
      if (typeof this.source === 'string') {
        return !/[ahqstv]/i.test(this.source);
      }
      return false;
    },
    get asBaseCommands() {
      if (this.guaranteesBaseCommands) {
        return this;
      }
      const self = this;
      var iter = new IterablePathData(function*() {
        for (var step of self) {
          switch (step.type) {
            case 'A':
              throw new Error('NYI');
              break;
            case 'a':
              throw new Error('NYI');
              break;
            case 'H':
              throw new Error('NYI');
              break;
            case 'h':
              throw new Error('NYI');
              break;
            case 'V':
              throw new Error('NYI');
              break;
            case 'v':
              throw new Error('NYI');
              break;
            case 'S':
              throw new Error('NYI');
              break;
            case 's':
              throw new Error('NYI');
              break;
            case 'Q':
              throw new Error('NYI');
              break;
            case 'q':
              throw new Error('NYI');
              break;
            case 'T':
              throw new Error('NYI');
              break;
            case 't':
              throw new Error('NYI');
              break;
            default: yield step;
          }
        }
      });
      Object.defineProperty(iter, 'guaranteesBaseCommands', {
        value: true,
      });
      if (this.guaranteesOneSegment) {
        Object.defineProperty(iter, 'guaranteesOneSegment', {
          value: true,
        });
      }
      Object.defineProperty(this, 'asBaseCommands', {
        value: iter,
      });
      return iter;
    },
    get guaranteesAbsolute() {
      if (typeof this.source === 'string') {
        return !/[a-z]/.test(this.source);
      }
      return false;
    },
    get asAbsolute() {
      if (this.guaranteesAbsolute) return this;
      const self = this;
      var iter = new IterablePathData(function*() {
        var x=0, y=0, x0=0, y0=0, mx=0, my=0;
        for (var step of self) {
          switch (step.type) {
            case 'M':
              x0 = x = step.values[step.values.length-2];
              y0 = y = step.values[step.values.length-1];
              yield step;
              break;
            case 'm':
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 2) {
                newValues.push(
                  x += step.values[step.values.length-2],
                  y += step.values[step.values.length-1]);
              }
              x0 = newValues[0];
              y0 = newValues[1];
              yield {type:'M', values:newValues};
              break;
            case 'Z': case 'z':
              x = x0;
              y = y0;
              yield step.type === 'Z' ? step : {type:'Z', values:step.values};
              break;
            case 'L': case 'C': case 'S': case 'Q': case 'T': case 'A':
              x = step.values[step.values.length-2];
              y = step.values[step.values.length-1];
              yield step;
              break;
            case 'l':
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 2) {
                newValues.push(
                  x += step.values[i],
                  y += step.values[i+1]);
              }
              yield {type:'L', values:newValues};
              break;
            case 'c':
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 6) {
                
              }
              yield {type:'C', values:newValues};
              break;
            case 's':
              throw new Error('NYI');
              break;
            case 'q':
              throw new Error('NYI');
              break;
            case 't':
              throw new Error('NYI');
              break;
            case 'a':
              throw new Error('NYI');
              break;
            case 'H':
              x = step.values[step.values.length-1];
              yield step;
              break;
            case 'V':
              x = step.values[step.values.length-1];
              yield step;
              break;
            case 'h':
              var newValues = [];
              for (var i = 0; i < step.values.length; i++) {
                newValues.push(x += step.values[i]);
              }
              yield {type:'H', values:newValues};
              break;
            case 'v':
              var newValues = [];
              for (var i = 0; i < step.values.length; i++) {
                newValues.push(y += step.values[i]);
              }
              yield {type:'V', values:newValues};
              break;
            default:
              throw new Error('unknown path step type: ' + step.type);
              break;
          }
        }
      });
      Object.defineProperty(iter, 'guaranteesAbsolute', {
        value: true,
      });
      if (this.guaranteesOneSegment) {
        Object.defineProperty(iter, 'guaranteesOneSegment', {
          value: true,
        });
      }
      Object.defineProperty(this, 'asAbsolute', {
        value: iter,
      });
      return iter;
    },
  };
  
  return IterablePathData;

});
