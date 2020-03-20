var confirmedArray, forecastConfirmed
var confirmedA, confirmedB
var deathsArray, forecastDeaths
var deathsA, deathsB
var recoveredArray, forecastRecovered
var recoveredA, recoveredB
var forecastLength = 7 //How many days into the future are forecasted
var states = []

async function main() {
  await getData()
  states = states.sort()
  populateStates()

  console.log(recoveredArray)

  regressData("confirmed", confirmedArray)
  regressData("deaths", deathsArray)
  regressData("recovered", recoveredArray)

  forecastConfirmed = forecastRange("confirmed")
  forecastDeaths = forecastRange("deaths")
  forecastRecovered = forecastRange("recovered")

  plotData("confirmed")
  plotData("deaths")
  plotData("recovered")

  setInterval(updateCurrentNumbers, 100)
}

async function getData() {
  var confirmedTimeSeries = await getConfirmed()
  confirmedArray = timeSeriesToArray(confirmedTimeSeries)
  var deathsTimeSeries = await getDeaths()
  deathsArray = timeSeriesToArray(deathsTimeSeries)
  var recoveredTimeSeries = await getRecovered()
  recoveredArray = timeSeriesToArray(recoveredTimeSeries)
}

async function getConfirmed() {
  return await getCovidData("https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv")
}
async function getDeaths() {
  return await getCovidData("https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv")
}
async function getRecovered() {
  return await getCovidData("https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv")
}

async function getCovidData(fileUrl) {
  let series = {}
  let state = document.getElementById("stateSelect").value
  console.log(state)
  return new Promise((resolve, reject) => {
    fetch(fileUrl)
    .then(response => {
      return response.json()
    })
    .then(data => {
      let decoded = atob(data.content)
      csv({
        output: "json"
      })
      .fromString(decoded)
      .then(result => {
        for(let i = 0; i < result.length; i++) {
          let region = result[i]
          if(state != "United States" && state != region["Province/State"]) continue
          if(region["Country/Region"] == "US") {
            for(date in region) {
              //Skip if not a date
              if(!Date.parse(date)) {
                continue
              }
              if(typeof(series[date]) == "undefined") {
                series[date] = 0
              }
              if(!region["Province/State"].includes(",") && !states.includes(region["Province/State"])) {
                states.push(region["Province/State"])
              }
              series[date] += parseInt(region[date])
            }
          }
        }
        console.log(series)
        resolve(series)    
      })
    })
    .catch(err => {
      reject(err)
    })
  })
}

function timeSeriesToArray(series) {
  let array = []
  for(var i = 0; i < Object.keys(series).length; i++) {
    array.push([i, series[Object.keys(series)[i]]])
  }
  if(isNaN(array[array.length-1][1])) {
    array.pop()
  }
  return array
}

//Finds the a and b constants for the exponential equation
function regressData(dataSet, data) {
  let trimmedData = []
  for(var i = 0; i < data.length; i++) {
    if(data[i][1] != 0) break
  }
  for(let x = i; x < data.length; x++) {
    trimmedData.push(data[x])
  }
  //console.log(trimmedData)
  let result = regression("exponential", trimmedData)
  a = result.equation[0]
  b = result.equation[1]
  switch(dataSet) {
    case "confirmed":
      confirmedA = a
      confirmedB = b
      break 
    case "deaths":
      deathsA = a
      deathsB = b
      break
    case "recovered":
      recoveredA = a
      recoveredB = b
      break
  }
  //console.log(result)
}

function forecast(dataSet, daySinceEpoch) {
  let a, b
  switch(dataSet) {
    case "confirmed":
      a = confirmedA
      b = confirmedB
      break 
    case "deaths":
      a = deathsA
      b = deathsB
      break
    case "recovered":
      a = recoveredA
      b = recoveredB
      break
  }
  return a * Math.exp(b * daySinceEpoch)
}

function forecastRange(dataSet) {
  let forcastArr = []
  for(var i = 0; i <= confirmedArray.length + forecastLength; i++) {
    forcastArr.push([i, forecast(dataSet, i)])
  }
  return forcastArr
}

function plotData(dataSet) {
  let plot, arr, forecastArr, x, y, markers, data, layout, title, markerName
  switch(dataSet) {
    case "confirmed":
      plot = document.getElementById("confirmedCasesGraph")
      forecastArr = forecastConfirmed
      arr = confirmedArray
      markerName = "Cases"
      title = `COVID-19 Cases in the US <br /> y = ${confirmedA} x e <sup>${confirmedB}x</sup>`
      break 
    case "deaths":
      plot = document.getElementById("deathsGraph")
      forecastArr = forecastDeaths
      arr = deathsArray
      markerName = "Deaths"
      title = `COVID-19 Deaths in the US <br /> y = ${deathsA} x e <sup>${deathsB}x</sup>`
      break
    case "recovered":
      plot = document.getElementById("recoveriesGraph")
      forecastArr = forecastRecovered
      arr = recoveredArray
      markerName = "Recoveries"
      title = `COVID-19 Recoveries in the US <br /> y = ${recoveredA} x e <sup>${recoveredB}x</sup>`
      break
  }
  x = []
  y = []
  arr.forEach(point => {
    x.push(point[0])
    y.push(point[1])
  })
  forecastX = []
  forecastY = []
  forecastArr.forEach(point => {
    forecastX.push(point[0])
    forecastY.push(point[1])
  })
  markers = {
    x: x,
    y: y,
    name: markerName,
    mode: "markers"
  }
  fitLine = {
    x: forecastX,
    y: forecastY,
    name: `Forecast ${markerName}`,
    mode: "lines"
  }
  data = [fitLine, markers]
  layout = {
    title: title,
    xaxis: {title: "Days since January 22, 2020"},
    yaxis: {title: `Number of confirmed ${markerName}`}
  }
  Plotly.newPlot(plot, data, layout, {responsive: true})
}

function updateCurrentNumbers() {
  let now = new Date()
  let then = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,0,0)
  let diff = now.getTime() - then.getTime()
  let infected = forecast("confirmed", confirmedArray.length-1 + (diff/8.64e+7))
  let dead = forecast("deaths", confirmedArray.length-1 + (diff/8.64e+7))
  let recovered = forecast("recovered", confirmedArray.length-1 + (diff/8.64e+7))
  
  document.getElementById("predictedInfected").innerHTML = `Est. Current Infections: ${Math.floor(infected)}`
  document.getElementById("predictedDead").innerHTML = `Est. Current Deaths: ${Math.floor(dead)}`
  document.getElementById("predictedRecovered").innerHTML = `Est. Current Recoveries: ${Math.floor(recovered)}`

  document.getElementById("infectedProgressBar").value = (infected - Math.floor(infected)) * 100
  document.getElementById("deadProgressBar").value = (dead - Math.floor(dead)) * 100
  document.getElementById("recoveredProgressBar").value = (recovered - Math.floor(recovered)) * 100
}

function populateStates() {
  let stateSelect = document.getElementById("stateSelect")
  states.forEach(state => {
    let option = document.createElement("option")
    option.innerHTML = state
    stateSelect.appendChild(option)
  })
}

document.getElementById("stateSelect").onchange = async function() {
  await getData()
  states = states.sort()
  populateStates()

  console.log(recoveredArray)

  regressData("confirmed", confirmedArray)
  regressData("deaths", deathsArray)
  regressData("recovered", recoveredArray)

  forecastConfirmed = forecastRange("confirmed")
  forecastDeaths = forecastRange("deaths")
  forecastRecovered = forecastRange("recovered")

  plotData("confirmed")
  plotData("deaths")
  plotData("recovered")
}

main()