function newTimeScale () {
  const MODULE_NAME = 'Time Scale'

  let thisObject = {
    lenghtPercentage: undefined,
    container: undefined,
    date: undefined,
    fitFunction: undefined,
    payload: undefined,
    onMouseOverSomeTimeMachineContainer: onMouseOverSomeTimeMachineContainer,
    physics: physics,
    draw: draw,
    drawForeground: drawForeground,
    getContainer: getContainer,
    initialize: initialize,
    finalize: finalize
  }

  const LENGHT_PERCENTAGE_DEFAULT_VALUE = 5
  const STEP_SIZE = 2.5
  const LENGHT_PERCENTAGE_MAX_VALUE = 400

  thisObject.container = newContainer()
  thisObject.container.initialize(MODULE_NAME)

  thisObject.container.isDraggeable = false
  thisObject.container.isClickeable = false
  thisObject.container.isWheelable = true
  thisObject.container.detectMouseOver = true

  thisObject.container.frame.width = UI_PANEL.WIDTH.NORMAL
  thisObject.container.frame.height = 40

  let visible = true
  let isMouseOver

  let onMouseWheelEventSubscriptionId
  let onMouseOverEventSubscriptionId
  let onMouseNotOverEventSubscriptionId

  let timeLineCoordinateSystem
  let limitingContainer

  let mouse = {
    position: {
      x: 0,
      y: 0
    }
  }
  return thisObject

  function finalize () {
    thisObject.container.eventHandler.stopListening(onMouseWheelEventSubscriptionId)
    thisObject.container.eventHandler.stopListening(onMouseOverEventSubscriptionId)
    thisObject.container.eventHandler.stopListening(onMouseNotOverEventSubscriptionId)

    thisObject.container.finalize()
    thisObject.container = undefined
    thisObject.fitFunction = undefined
    thisObject.payload = undefined

    timeLineCoordinateSystem = undefined
    limitingContainer = undefined
    mouse = undefined
  }

  function initialize (pTimeLineCoordinateSystem, pLimitingContainer) {
    timeLineCoordinateSystem = pTimeLineCoordinateSystem
    limitingContainer = pLimitingContainer

    onMouseWheelEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseWheel', onMouseWheel)
    onMouseOverEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseOver', onMouseOver)
    onMouseNotOverEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseNotOver', onMouseNotOver)

    thisObject.lenghtPercentage = LENGHT_PERCENTAGE_DEFAULT_VALUE
    readObjectState()

    let event = {}
    event.lenghtPercentage = thisObject.lenghtPercentage
    thisObject.container.eventHandler.raiseEvent('Lenght Percentage Changed', event)
  }

  function onMouseOverSomeTimeMachineContainer (event) {
    if (event.containerId === undefined) {
      /* This happens when the mouse over was not at the instance of a certain scale, but anywhere else. */
      visible = true
    } else {
      if (event.containerId === thisObject.container.id) {
        visible = true
      } else {
        visible = false
        turnOnCounter = 0
      }
    }
    mouse = {
      position: {
        x: event.x,
        y: event.y
      }
    }
  }

  function onMouseOver (event) {
    isMouseOver = true
    event.containerId = thisObject.container.id
    thisObject.container.eventHandler.raiseEvent('onMouseOverScale', event)
  }

  function onMouseNotOver () {
    isMouseOver = false
  }

  function onMouseWheel (event) {
    let morePower = 1
    if (event.buttons === 4) { morePower = 5 } // Mouse wheel pressed.

    delta = event.wheelDelta
    if (delta < 0) {
      thisObject.lenghtPercentage = thisObject.lenghtPercentage - STEP_SIZE * morePower
      if (thisObject.lenghtPercentage < STEP_SIZE) { thisObject.lenghtPercentage = STEP_SIZE }
    } else {
      thisObject.lenghtPercentage = thisObject.lenghtPercentage + STEP_SIZE * morePower
      if (thisObject.lenghtPercentage > LENGHT_PERCENTAGE_MAX_VALUE) { thisObject.lenghtPercentage = LENGHT_PERCENTAGE_MAX_VALUE }
    }

    event.lenghtPercentage = thisObject.lenghtPercentage
    thisObject.container.eventHandler.raiseEvent('Lenght Percentage Changed', event)

    saveObjectState()
  }

  function getContainer (point) {
    if (thisObject.container.frame.isThisPointHere(point, true) === true) {
      return thisObject.container
    }
  }

  function saveObjectState () {
    try {
      let code = JSON.parse(thisObject.payload.node.code)
      code.value = thisObject.lenghtPercentage / LENGHT_PERCENTAGE_MAX_VALUE * 100
      thisObject.payload.node.code = JSON.stringify(code)
    } catch (err) {
       // we ignore errors here since most likely they will be parsing errors.
    }
  }

  function readObjectState () {
    try {
      let code = JSON.parse(thisObject.payload.node.code)

      if (isNaN(code.value) || code.value === null || code.value === undefined) {
        saveObjectState()
        return
      }
      code.value = code.value / 100 * LENGHT_PERCENTAGE_MAX_VALUE
      if (code.value < STEP_SIZE) { code.value = STEP_SIZE }
      if (code.value > LENGHT_PERCENTAGE_MAX_VALUE) { code.value = LENGHT_PERCENTAGE_MAX_VALUE }

      if (code.value !== thisObject.lenghtPercentage) {
        thisObject.lenghtPercentage = code.value
        let event = {}
        event.lenghtPercentage = thisObject.lenghtPercentage
        thisObject.container.eventHandler.raiseEvent('Lenght Percentage Changed', event)
      } else {
        saveObjectState()
      }
    } catch (err) {
       // we ignore errors here since most likely they will be parsing errors.
    }
  }

  function physics () {
    readObjectState()
    positioningphysics()
  }

  function positioningphysics () {
    /* Container Limits */

    let upCorner = {
      x: 0,
      y: 0
    }

    let bottonCorner = {
      x: limitingContainer.frame.width,
      y: limitingContainer.frame.height
    }

    upCorner = transformThisPoint(upCorner, limitingContainer)
    bottonCorner = transformThisPoint(bottonCorner, limitingContainer)

    upCorner = limitingContainer.fitFunction(upCorner, true)
    bottonCorner = limitingContainer.fitFunction(bottonCorner, true)

    /* Mouse Position Date Calculation */
    let timePoint = {
      x: mouse.position.x,
      y: 0
    }

    let mouseDate = getDateFromPoint(timePoint, limitingContainer, timeLineCoordinateSystem)

    thisObject.date = new Date(mouseDate)

    /* timeScale Positioning */
    timePoint = {
      x: 0,
      y: 0
    }

    timePoint = transformThisPoint(timePoint, limitingContainer.frame.container)
    timePoint.x = mouse.position.x - thisObject.container.frame.width / 2

    /* Checking against the container limits. */
    if (timePoint.x < upCorner.x) { timePoint.x = upCorner.x }
    if (timePoint.x + thisObject.container.frame.width > bottonCorner.x) { timePoint.x = bottonCorner.x - thisObject.container.frame.width }
    if (timePoint.y < upCorner.y) { timePoint.y = upCorner.y }
    if (timePoint.y + thisObject.container.frame.height > bottonCorner.y) { timePoint.y = bottonCorner.y - thisObject.container.frame.height }

    thisObject.container.frame.position.x = timePoint.x
    thisObject.container.frame.position.y = timePoint.y
  }

  function draw () {
    drawScaleBox()
    if (visible === false) {
      drawScaleDisplayCover(thisObject.container)
    }
  }

  function drawForeground () {
    if (isMouseOver === true) {
      drawScaleBox()
      drawArrows()
    }
  }

  function drawScaleBox () {
    if (thisObject.date === undefined) { return }

    let label = thisObject.date.toUTCString()
    let labelArray = label.split(' ')
    let label1 = thisObject.payload.node.payload.parentNode.name
    let label2 = labelArray[1] + ' ' + labelArray[2] + ' ' + labelArray[3]
    let label3 = labelArray[4]

    let icon1 = canvas.designerSpace.iconByUiObjectType.get(thisObject.payload.node.payload.parentNode.type)
    let icon2 = canvas.designerSpace.iconByUiObjectType.get(thisObject.payload.node.type)

    let backgroundColor = UI_COLOR.BLACK

    drawScaleDisplay(label1, label2, label3, 0, 0, 0, icon1, icon2, thisObject.container, backgroundColor)
  }

  function drawArrows () {
    if (visible === false || thisObject.date === undefined) { return }

    const X_OFFSET = thisObject.container.frame.width / 2
    const Y_OFFSET = thisObject.container.frame.height / 2 - 10
    const HEIGHT = 18
    const WIDTH = 6
    const LINE_WIDTH = 3
    const OPACITY = 0.2
    const DISTANCE_BETWEEN_ARROWS = 10
    const MIN_DISTANCE_FROM_CENTER = 110
    const CURRENT_VALUE_DISTANCE = MIN_DISTANCE_FROM_CENTER + thisObject.lenghtPercentage
    const MAX_DISTANCE_FROM_CENTER = MIN_DISTANCE_FROM_CENTER + LENGHT_PERCENTAGE_MAX_VALUE + DISTANCE_BETWEEN_ARROWS

    let ARROW_DIRECTION = 0

    ARROW_DIRECTION = -1
    drawTwoArrows()
    ARROW_DIRECTION = 1
    drawTwoArrows()

    function drawTwoArrows () {
      point1 = {
        x: X_OFFSET - WIDTH / 2 * ARROW_DIRECTION + DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + CURRENT_VALUE_DISTANCE * ARROW_DIRECTION,
        y: Y_OFFSET - 0
      }

      point2 = {
        x: X_OFFSET + WIDTH / 2 * ARROW_DIRECTION + DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + CURRENT_VALUE_DISTANCE * ARROW_DIRECTION,
        y: Y_OFFSET + HEIGHT / 2
      }

      point3 = {
        x: X_OFFSET - WIDTH / 2 * ARROW_DIRECTION + DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + CURRENT_VALUE_DISTANCE * ARROW_DIRECTION,
        y: Y_OFFSET + HEIGHT
      }

      point1 = thisObject.container.frame.frameThisPoint(point1)
      point2 = thisObject.container.frame.frameThisPoint(point2)
      point3 = thisObject.container.frame.frameThisPoint(point3)

      point4 = {
        x: X_OFFSET - WIDTH / 2 * ARROW_DIRECTION - DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + CURRENT_VALUE_DISTANCE * ARROW_DIRECTION,
        y: Y_OFFSET - 0
      }

      point5 = {
        x: X_OFFSET + WIDTH / 2 * ARROW_DIRECTION - DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + CURRENT_VALUE_DISTANCE * ARROW_DIRECTION,
        y: Y_OFFSET + HEIGHT / 2
      }

      point6 = {
        x: X_OFFSET - WIDTH / 2 * ARROW_DIRECTION - DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + CURRENT_VALUE_DISTANCE * ARROW_DIRECTION,
        y: Y_OFFSET + HEIGHT
      }

      point4 = thisObject.container.frame.frameThisPoint(point4)
      point5 = thisObject.container.frame.frameThisPoint(point5)
      point6 = thisObject.container.frame.frameThisPoint(point6)

      point7 = {
        x: X_OFFSET + WIDTH / 2 * ARROW_DIRECTION + DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + MAX_DISTANCE_FROM_CENTER * ARROW_DIRECTION,
        y: Y_OFFSET - 0
      }

      point8 = {
        x: X_OFFSET - WIDTH / 2 * ARROW_DIRECTION + DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + MAX_DISTANCE_FROM_CENTER * ARROW_DIRECTION,
        y: Y_OFFSET + HEIGHT / 2
      }

      point9 = {
        x: X_OFFSET + WIDTH / 2 * ARROW_DIRECTION + DISTANCE_BETWEEN_ARROWS / 2 * ARROW_DIRECTION + MAX_DISTANCE_FROM_CENTER * ARROW_DIRECTION,
        y: Y_OFFSET + HEIGHT
      }

      point7 = thisObject.container.frame.frameThisPoint(point7)
      point8 = thisObject.container.frame.frameThisPoint(point8)
      point9 = thisObject.container.frame.frameThisPoint(point9)

      browserCanvasContext.setLineDash([0, 0])

      browserCanvasContext.beginPath()

      browserCanvasContext.moveTo(point1.x, point1.y)
      browserCanvasContext.lineTo(point2.x, point2.y)
      browserCanvasContext.lineTo(point3.x, point3.y)

      browserCanvasContext.moveTo(point4.x, point4.y)
      browserCanvasContext.lineTo(point5.x, point5.y)
      browserCanvasContext.lineTo(point6.x, point6.y)

      browserCanvasContext.moveTo(point7.x, point7.y)
      browserCanvasContext.lineTo(point8.x, point8.y)
      browserCanvasContext.lineTo(point9.x, point9.y)

      browserCanvasContext.lineWidth = LINE_WIDTH
      browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.DARK + ', ' + OPACITY + ')'
      browserCanvasContext.stroke()
    }
  }
}
