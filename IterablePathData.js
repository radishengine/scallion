define(function() {

  'use strict';
  
  function quadraticToCubic(x0,y0, qx,qy, x1,y1) {
    return [
      x0 + 2 * (qx - x0) / 3,
      y0 + 2 * (qy - y0) / 3,
      x1 + 2 * (qx - x1) / 3,
      y1 + 2 * (qy - y1) / 3];
  }
  
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
          values: v
            .slice(1)
            .trim()
            .split(/[\s,]+/g)
            .map(parseFloat),
        };
      });
  }
  
  const RX_NUM = /(?:[\+\-]?\s*(?:\d+(?:\.\d*)?|\.\d+)\s*(?:,\s*)?)/g;
  const RX_COMPLEX_PARAMS = new RegExp([
    '[mlt]\\s*' + RX_NUM.source + '{3,}',
    '[hv]\\s*' + RX_NUM.source + '{2,}',
    '[sq]\\s*' + RX_NUM.source + '{5,}',
    '[c]\\s*' + RX_NUM.source + '{7,}',
    '[a]\\s*' + RX_NUM.source + '{8,}',
  ].join('|'), 'gi');
  
  function toSimpleParams(str) {
    return str.replace(RX_COMPLEX_PARAMS, function(a) {
      var command = a[0];
      var paramCount;
      switch (command) {
        case 'm':
          command = 'l';
          paramCount = 2;
          break;
        case 'M':
          command = 'L';
          paramCount = 2;
          break;
        case 'l': case 'L': case 't': case 'T':
          paramCount = 2;
          break;
        case 'h': case 'H': case 'v': case 'V':
          paramCount = 1;
          break;
        case 's': case 'S': case 'q': case 'Q':
          paramCount = 4;
          break;
        case 'c': case 'C':
          paramCount = 6;
          break;
        case 'a': case 'A':
          paramCount = 7;
          break;
        default:
          throw new Error('unknown command: ' + command);
      }
      var p = -1;
      return a.replace(RX_NUM, function(num) {
        if (++p === paramCount) {
          num = command + num;
          p = 0;
        }
        return num;
      });
    });
  }
  
  const PROP_SELF = {
    get: function(){ return this; },
  };
  
  function PathState() {
  }
  PathState.prototype = {
    x0:0, y0:0,
    x:0, y:0,
    qx:0, qy:0,
    cx:0, cy:0,
    update: function(step) {
      switch (step.type) {
        case 'M':
          this.x0 = this.qx = this.cx = this.x = step.values[step.values.length - 2];
          this.y0 = this.qy = this.cy = this.y = step.values[step.values.length - 1];
          break;
        case 'm':
          var dx = 0, dy = 0;
          for (var i = 0; i < step.values.length; i += 2) {
            dx += step.values[i];
            dy += step.values[i+1];
          }
          this.x0 = this.qx = this.cx = this.x += dx;
          this.y0 = this.qy = this.cy = this.y += dy;
          break;
        case 'z': case 'Z':
          this.qx = this.cx = this.x = this.x0;
          this.qy = this.cy = this.y = this.y0;
          break;
        case 'A':
        case 'L':
          this.qx = this.cx = this.x = step.values[step.values.length - 2];
          this.qy = this.cy = this.y = step.values[step.values.length - 1];
          break;
        case 'a':
          var dx = 0, dy = 0;
          for (var i = 0; i < step.values.length; i += 7) {
            dx += step.values[i+5];
            dy += step.values[i+6];
          }
          this.qx = this.cx = this.x += dx;
          this.qy = this.cy = this.y += dy;
          break;
        case 'l':
          var dx = 0, dy = 0;
          for (var i = 0; i < step.values.length; i += 2) {
            dx += step.values[i];
            dy += step.values[i+1];
          }
          this.qx = this.cx = this.x += dx;
          this.qy = this.cy = this.y += dy;
          break;
        case 'H':
          this.qx = this.cx = this.x = step.values[step.values.length-1];
          break;
        case 'h':
          var dx = 0;
          for (var i = 0; i < step.values.length; i++) {
            dx += step.values[i];
          }
          this.qx = this.cx = this.x += dx;
          break;
        case 'V':
          this.qy = this.cy = this.y = step.values[step.values.length-1];
          break;
        case 'v':
          var dy = 0;
          for (var i = 0; i < step.values.length; i++) {
            dy += step.values[i];
          }
          this.qy = this.cy = this.y += dy;
          break;
        case 'C':
        case 'S':
          this.cx = step.values[step.values.length - 4];
          this.cy = step.values[step.values.length - 3];
          this.qx = this.x = step.values[step.values.length - 2];
          this.qy = this.y = step.values[step.values.length - 1];
          break;
        case 'c':
          var x = this.x, y = this.y, cx, cy;
          for (var i = 0; i < step.values.length; i += 6) {
            cx = x + step.values[i+2];
            cy = y + step.values[i+3];
            x += step.values[i+4];
            y += step.values[i+5];
          }
          this.cx = cx;
          this.cy = cy;
          this.qx = this.x = x;
          this.qy = this.y = y;
          break;
        case 's':
          var x = this.x, y = this.y, cx, cy;
          for (var i = 0; i < step.values.length; i += 4) {
            cx = x + step.values[i];
            cy = y + step.values[i+1];
            x += step.values[i+2];
            y += step.values[i+3];
          }
          this.cx = cx;
          this.cy = cy;
          this.qx = this.x = x;
          this.qy = this.y = y;
          break;
        case 'Q':
          this.qx = step.values[step.values.length - 4];
          this.qy = step.values[step.values.length - 3];
          this.cx = this.x = step.values[step.values.length - 2];
          this.cy = this.y = step.values[step.values.length - 1];
          break;
        case 'q':
          var x = this.x, y = this.y, qx, qy;
          for (var i = 0; i < step.values.length; i += 4) {
            qx = x + step.values[i];
            qy = y + step.values[i+1];
            x += step.values[i+2];
            y += step.values[i+3];
          }
          this.qx = qx;
          this.qy = qy;
          this.cx = this.x = x;
          this.cy = this.y = y;
          break;
        case 'T':
          var x = this.x, y = this.y, qx = this.qx, qy = this.qy;
          for (var i = 0; i < step.values.length; i += 2) {
            qx = x + x - qx;
            qy = y + y - qy;
            x = step.values[i];
            y = step.values[i+1];
          }
          this.qx = qx;
          this.qy = qy;
          this.cx = this.x = x;
          this.cy = this.y = y;
          break;
        case 't':
          var x = this.x, y = this.y, qx = this.qx, qy = this.qy;
          for (var i = 0; i < step.values.length; i += 2) {
            qx = x + x - qx;
            qy = y + y - qy;
            x += step.values[i];
            y += step.values[i+1];
          }
          this.qx = qx;
          this.qy = qy;
          this.cx = this.x = x;
          this.cy = this.y = y;
          break;
      }
    },
  };
  
  function IterablePathData(source) {
    if (typeof source === 'function') {
      this[Symbol.iterator] = source;
      Object.defineProperty(this, 'source', PROP_SELF);
    }
    else if (Symbol.iterator in source) {
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
    toSegments: function() {
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
    get guaranteesSimpleParams() {
      if (typeof this.source === 'string') {
        return this === this.asSimpleParams;
      }
      return false;
    },
    get asSimpleParams() {
      var iter;
      if (typeof this.source === 'string') {
        var simplified = toSimpleParams(this.source);
        if (simplified === this.source) {
          iter = this;
        }
        else {
          iter = new IterablePathData(simplified);
        }
      }
      else if (this.guaranteesSimpleParams) {
        return this;
      }
      else {
        const source = this.source;
        iter = new IterablePathData(function*() {
          var paramCount;
          for (var step of source) {
            switch (step.type) {
              case 'z': case 'Z': yield step; continue;
              case 'm': case 'M':
                if (step.values.length === 2) {
                  yield step;
                }
                else {
                  yield {type:step.type, values:step.values.slice(0, 2)};
                  var type = step.type === 'm' ? 'l' : 'L';
                  for (var i = 2; i < step.values.length; i += 2) {
                    yield {type:type, values:step.values.slice(i, i+2)};
                  }
                }
                continue;
              case 'l': case 'L': case 't': case 'T':
                paramCount = 2;
                break;
              case 'h': case 'H': case 'v': case 'V':
                paramCount = 1;
                break;
              case 's': case 'S': case 'q': case 'Q':
                paramCount = 4;
                break;
              case 'c': case 'C':
                paramCount = 6;
                break;
              case 'a': case 'A':
                paramCount = 7;
                break;
              default:
                throw new Error('unknown command: ' + step.type);
            }
            if (paramCount === step.values.length) {
              yield step;
            }
            else {
              for (var i = 0; i < step.values.length; i += paramCount) {
                yield {
                  type: step.type,
                  values: step.values.slice(i, i+paramCount),
                };
              }
            }
          }
        });
      }
      Object.defineProperty(this, 'asSimpleParams', {
        value: iter,
      });
      return iter;
    },
    get guaranteesUnreflected() {
      if (typeof this.source === 'string') {
        return !/[st]/i.test(this.source);
      }
      return false;
    },
    get asUnreflected() {
      if (this.guaranteesUnreflected) return this;
      const source = this;
      var iter = new IterablePathData(function*() {
        var state = new PathState;
        for (var step of source) {
          switch (step.type) {
            case 'S':
              var x=state.x, y=state.y, cx=state.cx, cy=state.cy;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 4) {
                newValues.push(x + x-cx, y + y-cy);
                newValues.push(
                  cx = step.values[i],
                  cy = step.values[i+1],
                  x = step.values[i+2],
                  y = step.values[i+3]);
              }
              yield {type:'C', values:newValues};
              break;
            case 's':
              var x=state.x, y=state.y, cx=state.cx, cy=state.cy;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 4) {
                newValues.push(
                  x - cx,
                  y - cy,
                  step.values[i],
                  step.values[i+1],
                  step.values[i+2],
                  step.values[i+3]);
                cx = x + step.values[i];
                cy = y + step.values[i+1];
                x += step.values[i+2];
                y += step.values[i+3];
              }
              yield {type:'c', values:newValues};
              break;
            case 'T':
              var x=state.x, y=state.y, qx=state.qx, qy=state.qy;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 2) {
                newValues.push(
                  qx = x + x - qx,
                  qy = y + y - qy);
                newValues.push(
                  x = step.values[i],
                  y = step.values[i+1]);
              }
              yield {type:'Q', values:newValues};
              break;
            case 't':
              var x=state.x, y=state.y, qx=state.qx, qy=state.qy;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 2) {
                newValues.push(
                  x - qx,
                  y - qy,
                  step.values[i],
                  step.values[i+1]);
                qx = x + x - qx;
                qy = y + y - qy;
                x += step.values[0];
                y += step.values[1];
              }
              yield {type:'q', values:newValues};
              break;
            default:
              yield step;
              break;
          }
          state.update(step);
        }
      });
      Object.defineProperty(this, 'asUnreflected', {
        value: iter,
      });
      return iter;
    },
    get guaranteesCubicOnly() {
      if (typeof this.source === 'string') {
        return !/[aqt]/i.test(this.source);
      }
      return false;
    },
    get asCubicOnly() {
      if (this.guaranteesCubicOnly) return this;
      const self = this;
      var iter = new IterablePathData(function*() {
        var state = new PathState;
        for (var step of self) {
          switch (step.type) {
            case 'Q':
              var x = state.x, y = state.y;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 4) {
                var qx = step.values[i], qy = step.values[i+1];
                var nx = step.values[i+2], ny = step.values[i+3];
                var controls = quadraticToCubic(
                  x, y,
                  qx, qy,
                  nx, ny);
                newValues.push(
                  controls[0], controls[1],
                  controls[2], controls[3],
                  x = nx, y = ny);
              }
              yield {type:'C', values:newValues};
              break;
            case 'q':
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 4) {
                var qx = step.values[i], qy = step.values[i+1];
                var nx = step.values[i+2], ny = step.values[i+3];
                var controls = quadraticToCubic(
                  0, 0,
                  qx, qy,
                  nx, ny);
                newValues.push(
                  controls[0], controls[1],
                  controls[2], controls[3],
                  nx, ny);
              }
              yield {type:'c', values:newValues};
              break;
            case 'T':
              break;
            case 't':
              break;
            case 'A':
              break;
            case 'a':
              break;
            default:
              yield step;
              break;
          }
          state.update(step);
        }
      });
      Object.defineProperty(this, 'asCubicOnly', {
        value: iter,
      });
      Object.defineProperty(iter, 'guaranteesCubicOnly', {
        value: true,
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
        var state = new PathState;
        for (var step of self) {
          switch (step.type) {
            case 'l':
            case 'm':
            case 't':
              var x = state.x, y = state.y;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 2) {
                newValues.push(
                  x += step.values[i],
                  y += step.values[i+1]);
              }
              yield {
                type: step.type.toUpperCase(),
                values: newValues,
              };
              break;
            case 'q':
              var x = state.x, y = state.y;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 2) {
                newValues.push(
                  x + step.values[i],
                  y + step.values[i+1]);
                newValues.push(
                  x += step.values[i+2],
                  y += step.values[i+3]);
              }
              yield {type:'Q', values:newValues};
              break;
            case 'c':
              var x = state.x, y = state.y;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 6) {
                newValues.push(
                  x + step.values[i],
                  y + step.values[i+1],
                  x + step.values[i+2],
                  y + step.values[i+3]);
                newValues.push(
                  x += step.values[i+4],
                  y += step.values[i+5]);
              }
              yield {type:'C', values:newValues};
              break;
            case 'a':
              var x = state.x, y = state.y;
              var newValues = [];
              for (var i = 0; i < step.values.length; i += 7) {
                newValues.push(
                  step.values[i],
                  step.values[i+1],
                  step.values[i+2],
                  step.values[i+3],
                  step.values[i+4],
                  x += step.values[i+5],
                  y += step.values[i+6]);
              }
              yield {type:'A', values:newValues};
              break;
            case 'z':
              yield {type:'Z'};
              break;
            default:
              yield step;
              break;
          }
          state.update(step);
        }
      });
      Object.defineProperty(iter, 'guaranteesAbsolute', {
        value: true,
      });
      Object.defineProperty(this, 'asAbsolute', {
        value: iter,
      });
      return iter;
    },
  };
  
  return IterablePathData;

});
